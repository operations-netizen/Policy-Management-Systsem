import { ApiError } from "@/lib/api";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css"; 
import { Toaster } from "sonner";
const queryClient = new QueryClient();
const redirectToLoginIfUnauthorized = (error) => {
    if (!(error instanceof ApiError))
        return;
    if (typeof window === "undefined")
        return;
    const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
    if (!isUnauthorized)
        return;
    window.location.href = getLoginUrl(); 
}; 
queryClient.getQueryCache().subscribe(event => {
    if (event.type === "updated" && event.action.type === "error") {
        const error = event.query.state.error;
        redirectToLoginIfUnauthorized(error);
        if (!event.query.options?.meta?.silentError) {
            console.error("[API Query Error]", error);
        }
    }
});
queryClient.getMutationCache().subscribe(event => {
    if (event.type === "updated" && event.action.type === "error") {
        const error = event.mutation.state.error;
        redirectToLoginIfUnauthorized(error);
        console.error("[API Mutation Error]", error);
    }
});
createRoot(document.getElementById("root")).render(<QueryClientProvider client={queryClient}>
    <App />
    <Toaster position="top-right" richColors/>
  </QueryClientProvider>);
