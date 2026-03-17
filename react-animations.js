(function () {
  const rootElement = document.getElementById("react-animations-root");
  if (!rootElement || !window.React || !window.ReactDOM) return;

  const { createElement: e, useEffect, useState } = window.React;

  function AnimationHub() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
      const pushToast = (detail) => {
        const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const next = {
          id,
          title: detail?.title || "Ação executada",
          message: detail?.message || "Operação concluída",
          kind: detail?.kind || "info",
        };

        setToasts((prev) => [...prev, next]);

        window.setTimeout(() => {
          setToasts((prev) => prev.filter((item) => item.id !== id));
        }, 2200);
      };

      const onPopup = (event) => pushToast({
        title: "Popup aberto",
        message: event.detail?.message || "Janela exibida",
        kind: "info",
      });

      const onSuccess = (event) => pushToast({
        title: "Sucesso",
        message: event.detail?.message || "Registro concluído",
        kind: "success",
      });

      const onWarning = (event) => pushToast({
        title: "Atenção",
        message: event.detail?.message || "Ajuste realizado",
        kind: "warning",
      });

      window.addEventListener("dashboard:popup-opened", onPopup);
      window.addEventListener("dashboard:action-success", onSuccess);
      window.addEventListener("dashboard:action-warning", onWarning);

      return () => {
        window.removeEventListener("dashboard:popup-opened", onPopup);
        window.removeEventListener("dashboard:action-success", onSuccess);
        window.removeEventListener("dashboard:action-warning", onWarning);
      };
    }, []);

    return e(
      "div",
      { className: "react-toast-layer", "aria-live": "polite", "aria-atomic": "true" },
      toasts.map((toast) =>
        e(
          "article",
          { key: toast.id, className: `react-toast react-toast-${toast.kind}` },
          e("h4", null, toast.title),
          e("p", null, toast.message),
        ),
      ),
    );
  }

  const root = window.ReactDOM.createRoot(rootElement);
  root.render(e(AnimationHub));
})();
