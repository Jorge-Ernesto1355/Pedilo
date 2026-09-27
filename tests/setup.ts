import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { createElement } from "react";
import { afterEach, vi } from "vitest";

const routerPush = vi.fn();

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "", className: "" }),
  Source_Serif_4: () => ({ variable: "", className: "" }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const safeProps = { ...props };
    delete safeProps.fill;
    delete safeProps.priority;
    return createElement("img", safeProps);
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => createElement("a", props, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, replace: routerPush, back: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

window.scrollTo = () => undefined;
