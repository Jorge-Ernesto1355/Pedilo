import { afterEach, describe, expect, it } from 'vitest'
import {
    applyTemplate,
    contrastIssues,
    contrastRatio,
    designCssVariables,
    designFromTemplate,
    DESIGN_TEMPLATES,
    fixDesignContrast,
    gridColumns,
    normalizeDesign,
    progressText,
} from '@/app/components/loyalty/loyaltyDesign'
import {
    clearCardToken,
    computeAnimateFrom,
    displayedStamps,
    readCardToken,
    readSeenProgress,
    saveCardToken,
    writeSeenProgress,
} from '@/app/components/loyalty/loyaltyStorage'

const TOKEN = 'Ab3_-xY9Ab3_-xY9Ab3_-xY9Ab3_-xY9Ab3_-xY9abc'

describe('plantillas de la tarjeta de lealtad', () => {
    it.each(DESIGN_TEMPLATES)('la plantilla %s cumple el contraste del editor', (template) => {
        expect(contrastIssues(designFromTemplate(template, 'Mi café'))).toEqual([])
    })

    it('aplicar una plantilla conserva el título que escribió el dueño', () => {
        const current = designFromTemplate('clasica', 'Mi café')
        current.text.title = 'Café Roma'
        const next = applyTemplate(current, 'oscura')
        expect(next.template).toBe('oscura')
        expect(next.text.title).toBe('Café Roma')
        expect(next.background.color1).toBe('#15171C')
    })

    it('el título por defecto es el nombre del restaurante recortado a 30 caracteres', () => {
        expect(
            designFromTemplate('clasica', 'Taquería Los Primos del Puerto de Mazatlán').text.title
                .length,
        ).toBeLessThanOrEqual(30)
    })
})

describe('contraste', () => {
    it('calcula la relación WCAG', () => {
        expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
        expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1)
    })

    it('detecta texto y sello lleno sin contraste suficiente', () => {
        const design = designFromTemplate('clasica', 'X')
        design.text.primaryColor = '#EEEEEE'
        design.stamp.filledColor = '#F2EEE6'
        expect(contrastIssues(design).map((issue) => issue.key)).toEqual([
            'primaryText',
            'filledStamp',
        ])
    })

    it('en degradado mide contra el peor de los dos colores', () => {
        const design = designFromTemplate('calida', 'X')
        design.background.color2 = '#5A2A12'
        expect(contrastIssues(design).map((issue) => issue.key)).toContain('primaryText')
    })

    it('"Corregir automáticamente" deja todo en verde', () => {
        const design = designFromTemplate('moderna', 'X')
        design.text.primaryColor = '#2A4BB8'
        design.text.secondaryColor = '#1E40AF'
        design.stamp.filledColor = '#1F44B5'
        expect(contrastIssues(design)).not.toEqual([])
        expect(contrastIssues(fixDesignContrast(design))).toEqual([])
    })
})

describe('diseño seguro', () => {
    it('nunca deja pasar valores fuera de la lista cerrada a los estilos', () => {
        const design = normalizeDesign(
            {
                template: 'clasica',
                background: {
                    type: 'solid',
                    color1: 'red; background:url(x)',
                    color2: '#FFF',
                    angle: 999,
                    pattern: 'x',
                    patternOpacity: 9,
                },
                text: {
                    primaryColor: 'expression(alert(1))',
                    title: '<b>Hola</b>\u0000',
                    font: 'comic',
                },
                stamp: { shape: 'triangle', icon: 'bomb' },
            },
            'Mi café',
        )
        const variables = designCssVariables(design)
        for (const value of Object.values(variables)) {
            expect(value).not.toMatch(/url\(|expression|;/)
        }
        expect(design.background.angle).toBe(360)
        expect(design.background.patternOpacity).toBe(1)
        expect(design.stamp.shape).toBe('circle')
        expect(design.text.font).toBe('serif')
        // El texto se guarda tal cual (sin controles) y React lo muestra escapado.
        expect(design.text.title).toBe('<b>Hola</b>')
    })

    it('reparte los sellos en columnas parejas', () => {
        const design = designFromTemplate('clasica', 'X')
        expect(gridColumns(design, 5)).toBe(5)
        expect(gridColumns(design, 8)).toBe(4)
        expect(gridColumns(design, 20)).toBe(5)
        design.layout.columns = 3
        expect(gridColumns(design, 8)).toBe(3)
    })

    it('escribe el avance en español', () => {
        expect(progressText(5, 8, false)).toBe('Te faltan 3 sellos para tu premio')
        expect(progressText(7, 8, false)).toBe('Te falta 1 sello para tu premio')
        expect(progressText(8, 8, true)).toBe('Tu premio está listo')
    })
})

describe('sellos vistos y token en el navegador', () => {
    afterEach(() => localStorage.clear())

    it('la primera vez anima todos los sellos', () => {
        expect(
            computeAnimateFrom(null, {
                stampsCount: 5,
                stampsRequired: 8,
                cyclesCompleted: 0,
                rewardAvailable: false,
            }),
        ).toBe(0)
    })

    it('anima solo la diferencia y no repite al recargar', () => {
        const card = {
            stampsCount: 5,
            stampsRequired: 8,
            cyclesCompleted: 0,
            rewardAvailable: false,
        }
        expect(computeAnimateFrom({ cycles: 0, count: 3 }, card)).toBe(3)
        expect(computeAnimateFrom({ cycles: 0, count: 5 }, card)).toBe(5)
    })

    it('al completar la tarjeta anima hasta llenarla', () => {
        const card = {
            stampsCount: 0,
            stampsRequired: 8,
            cyclesCompleted: 1,
            rewardAvailable: true,
        }
        expect(displayedStamps(card)).toBe(8)
        expect(computeAnimateFrom({ cycles: 0, count: 7 }, card)).toBe(7)
    })

    it('si un sello se anuló, no anima', () => {
        const card = {
            stampsCount: 7,
            stampsRequired: 8,
            cyclesCompleted: 0,
            rewardAvailable: false,
        }
        expect(computeAnimateFrom({ cycles: 1, count: 8 }, card)).toBe(7)
    })

    it('guarda el progreso visto y el token con try/catch', () => {
        writeSeenProgress(TOKEN, { cycles: 1, count: 2 })
        expect(readSeenProgress(TOKEN)).toEqual({ cycles: 1, count: 2 })
        localStorage.setItem(`pedilo:loyalty:seen:${TOKEN}`, '{roto')
        expect(readSeenProgress(TOKEN)).toBeNull()
        saveCardToken('mi-cafe', TOKEN)
        expect(readCardToken('mi-cafe')).toBe(TOKEN)
        saveCardToken('mi-cafe', 'no-es-token')
        expect(readCardToken('mi-cafe')).toBe(TOKEN)
        clearCardToken('mi-cafe')
        expect(readCardToken('mi-cafe')).toBeNull()
    })

    it('sin almacenamiento disponible no truena', () => {
        const original = Storage.prototype.getItem
        Storage.prototype.getItem = () => {
            throw new Error('SecurityError')
        }
        try {
            expect(readCardToken('mi-cafe')).toBeNull()
            expect(readSeenProgress(TOKEN)).toBeNull()
        } finally {
            Storage.prototype.getItem = original
        }
    })
})
