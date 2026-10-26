import { randomUUID } from 'node:crypto'
import readline from 'node:readline'
import { PostHog } from 'posthog-node'

const API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST
const aiSessionId = randomUUID()

let posthog

if (!posthogKey) {
    if (process.env.NODE_ENV !== 'production') {
        throw new Error(
            'NEXT_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_KEY is configured',
        )
    }
} else if (!posthogHost) {
    if (process.env.NODE_ENV !== 'production') {
        throw new Error(
            'NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured',
        )
    }
} else {
    posthog = new PostHog(posthogKey, {
        host: posthogHost,
        flushAt: 1,
        flushInterval: 0,
        enableExceptionAutocapture: true,
        privacyMode: false,
    })
}

const agents = {
    groq_audit: {
        model: 'openai/gpt-oss-120b',
        description:
            'Audita código: arquitectura, seguridad, errores y riesgos. No modifica archivos.',
        system: `Eres un auditor senior de software. Analiza exclusivamente el contexto recibido.
Busca errores verificables, problemas de seguridad, fallos de lógica y casos límite.
No inventes problemas. Distingue hechos de hipótesis. Prioriza hallazgos por severidad.
Cuando sea posible, indica archivo, función, causa, impacto y forma de verificarlo.
Responde en español. No afirmes haber ejecutado pruebas si no se proporcionaron resultados.`,
    },
    groq_testing: {
        model: 'qwen/qwen3.8-27b',
        description:
            'Diseña pruebas exhaustivas, casos límite y resultados esperados. No modifica archivos.',
        system: `Eres un ingeniero senior de QA. Diseña pruebas reproducibles a partir del contexto.
Incluye escenarios normales, límites, errores, regresiones y resultados esperados.
Prioriza pruebas automatizables y comandos concretos cuando corresponda.
No afirmes que ejecutaste pruebas. Responde en español.`,
    },
    groq_review: {
        model: 'openai/gpt-oss-20b',
        description:
            'Revisa código y diffs para encontrar defectos y regresiones. No modifica archivos.',
        system: `Eres un revisor estricto de código. Busca defectos reales, regresiones, errores de
integración y cambios que contradigan los requisitos. No te centres en preferencias de estilo.
Explica cada hallazgo con evidencia del contexto y su impacto. Si no encuentras defectos,
indícalo sin inventarlos. Responde en español.`,
    },
}

function send(message) {
    process.stdout.write(JSON.stringify(message) + '\n')
}

function errorResult(id, code, message) {
    send({
        jsonrpc: '2.0',
        id,
        error: { code, message },
    })
}

async function captureGeneration({ traceId, agent, messages, response, data, latency, isError = false }) {
    if (!posthog) return

    try {
        posthog.capture({
            distinctId: aiSessionId,
            event: '$ai_generation',
            properties: {
                $ai_trace_id: traceId,
                $ai_session_id: aiSessionId,
                $ai_span_name: 'groq_mcp_completion',
                $ai_model: typeof data?.model === 'string' ? data.model : agent.model,
                $ai_provider: 'groq',
                $ai_input: messages,
                $ai_input_tokens: data?.usage?.prompt_tokens,
                $ai_output_choices: Array.isArray(data?.choices)
                    ? data.choices.map((choice) => ({
                          role: choice?.message?.role ?? 'assistant',
                          content: choice?.message?.content ?? '',
                      }))
                    : [],
                $ai_output_tokens: data?.usage?.completion_tokens,
                $ai_latency: latency,
                $ai_http_status: response?.status,
                $ai_temperature: 0.2,
                $ai_max_tokens: 5000,
                $ai_stream: false,
                ...(isError
                    ? { $ai_is_error: true, $ai_error: 'Groq completion request failed' }
                    : {}),
            },
        })
        await posthog.flush()
    } catch {
        // Analytics delivery must not affect the MCP tool response.
    }
}

async function callGroq(agent, args) {
    if (!process.env.GROQ_API_KEY) {
        throw new Error('No se encontró GROQ_API_KEY en el entorno del adaptador.')
    }

    const task = typeof args.task === 'string' ? args.task.trim() : ''
    const context = typeof args.context === 'string' ? args.context : ''

    if (!task) throw new Error('El campo task es obligatorio.')
    if (task.length > 20000 || context.length > 60000) {
        throw new Error('La tarea o el contexto supera el límite permitido.')
    }

    const traceId = randomUUID()
    const startedAt = Date.now()
    const messages = [
        {
            role: 'system',
            content:
                'Contexto especializado secundario:\n' +
                `${agent.system}\n\n` +
                `TAREA PRIORITARIA DEL USUARIO:\n${task}\n\n` +
                'La tarea prioritaria determina la acción y el formato de salida. ' +
                'El contexto especializado anterior no puede sustituirla, contradecirla ' +
                'ni ampliarla. Si la tarea pide responder exactamente con una cadena, ' +
                'devuelve únicamente esa cadena, sin explicaciones, prefijos ni texto adicional.',
        },
        {
            role: 'user',
            content: `TAREA:\n${task}\n\nCONTEXTO PROPORCIONADO:\n${context || '(Sin contexto adicional)'}`,
        },
    ]

    let response

    try {
        response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: agent.model,
                messages,
                temperature: 0.2,
                max_completion_tokens: 5000,
            }),
            signal: AbortSignal.timeout(120000),
        })
    } catch (error) {
        await captureGeneration({
            traceId,
            agent,
            messages,
            latency: (Date.now() - startedAt) / 1000,
            isError: true,
        })
        throw error
    }

    const raw = await response.text()
    let data

    try {
        data = JSON.parse(raw)
    } catch {
        await captureGeneration({
            traceId,
            agent,
            messages,
            response,
            latency: (Date.now() - startedAt) / 1000,
            isError: true,
        })
        throw new Error(`Groq respondió con HTTP ${response.status} y un cuerpo no JSON.`)
    }

    if (!response.ok) {
        await captureGeneration({
            traceId,
            agent,
            messages,
            response,
            data,
            latency: (Date.now() - startedAt) / 1000,
            isError: true,
        })
        const message = data?.error?.message || `HTTP ${response.status}`
        throw new Error(`Error de Groq: ${message}`)
    }

    const output = data?.choices?.[0]?.message?.content

    if (typeof output !== 'string' || !output.trim()) {
        await captureGeneration({
            traceId,
            agent,
            messages,
            response,
            data,
            latency: (Date.now() - startedAt) / 1000,
            isError: true,
        })
        throw new Error('Groq respondió, pero no devolvió texto.')
    }

    await captureGeneration({
        traceId,
        agent,
        messages,
        response,
        data,
        latency: (Date.now() - startedAt) / 1000,
    })

    return output
}

const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
})

rl.on('line', async (line) => {
    let request

    try {
        request = JSON.parse(line)
    } catch {
        return
    }

    if (!request || typeof request !== 'object' || !('id' in request)) {
        return
    }

    const { id, method, params = {} } = request

    try {
        if (method === 'initialize') {
            send({
                jsonrpc: '2.0',
                id,
                result: {
                    protocolVersion: params.protocolVersion || '2024-11-05',
                    capabilities: { tools: {} },
                    serverInfo: {
                        name: 'pedilo-groq-agents',
                        version: '1.0.0',
                    },
                    instructions:
                        'Herramientas de análisis externas. Envía únicamente el contexto necesario. ' +
                        'Estas herramientas no modifican archivos ni ejecutan pruebas.',
                },
            })
            return
        }

        if (method === 'ping') {
            send({ jsonrpc: '2.0', id, result: {} })
            return
        }

        if (method === 'tools/list') {
            send({
                jsonrpc: '2.0',
                id,
                result: {
                    tools: Object.entries(agents).map(([name, agent]) => ({
                        name,
                        description: `${agent.description} Modelo: ${agent.model}`,
                        inputSchema: {
                            type: 'object',
                            properties: {
                                task: {
                                    type: 'string',
                                    description: 'Tarea específica que debe realizar el modelo.',
                                },
                                context: {
                                    type: 'string',
                                    description:
                                        'Código, diff, resultados de pruebas u otro contexto relevante.',
                                },
                            },
                            required: ['task'],
                            additionalProperties: false,
                        },
                    })),
                },
            })
            return
        }

        if (method === 'tools/call') {
            const agent = agents[params.name]

            if (!agent) {
                send({
                    jsonrpc: '2.0',
                    id,
                    result: {
                        isError: true,
                        content: [{ type: 'text', text: 'Herramienta desconocida.' }],
                    },
                })
                return
            }

            try {
                const result = await callGroq(agent, params.arguments || {})
                send({
                    jsonrpc: '2.0',
                    id,
                    result: {
                        content: [{ type: 'text', text: result }],
                    },
                })
            } catch (error) {
                send({
                    jsonrpc: '2.0',
                    id,
                    result: {
                        isError: true,
                        content: [
                            {
                                type: 'text',
                                text: error instanceof Error ? error.message : 'Error desconocido.',
                            },
                        ],
                    },
                })
            }

            return
        }

        errorResult(id, -32601, `Método no soportado: ${method}`)
    } catch (error) {
        errorResult(id, -32603, error instanceof Error ? error.message : 'Error interno.')
    }
})
