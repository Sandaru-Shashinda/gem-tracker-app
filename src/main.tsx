// import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"
import { GemProvider } from "./hooks/useGemStore.tsx"
import { ToastProvider } from "./components/ui/toast.tsx"

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <GemProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </GemProvider>,
  // </StrictMode>,
)
