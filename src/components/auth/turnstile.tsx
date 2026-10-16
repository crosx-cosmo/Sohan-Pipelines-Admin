import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window { turnstile?: TurnstileApi }
}

export function Turnstile({ siteKey, onToken, onError }: {
  siteKey: string;
  onToken: (token: string) => void;
  onError: (message: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onToken, onError });
  callbacks.current = { onToken, onError };
  useEffect(() => {
    let disposed = false;
    let widget: string | undefined;
    const render = () => {
      if (disposed || !container.current || !window.turnstile || widget) return;
      widget = window.turnstile.render(container.current, {
        sitekey: siteKey,
        action: "admin_login",
        theme: "auto",
        size: "flexible",
        callback: (token: string) => callbacks.current.onToken(token),
        "expired-callback": () => callbacks.current.onToken(""),
        "error-callback": () => {
          callbacks.current.onToken("");
          callbacks.current.onError("Security check could not load. Please retry.");
        },
      });
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
    const fail = () => callbacks.current.onError("Security check could not load. Please retry.");
    if (!script) {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset["turnstile"] = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    script.addEventListener("error", fail);
    render();
    const timeout = window.setTimeout(() => {
      if (!widget && !disposed) fail();
    }, 15000);
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      script?.removeEventListener("load", render);
      script?.removeEventListener("error", fail);
      if (widget && window.turnstile) window.turnstile.remove(widget);
    };
  }, [siteKey]);
  return <div ref={container} className="min-h-[65px] w-full" aria-label="Security verification" />;
}