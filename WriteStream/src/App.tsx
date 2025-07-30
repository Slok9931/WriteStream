import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WalletProvider } from "@/contexts/WalletContext";
import { PrivateRoute } from "@/components/PrivateRoute";
import ConnectWallet from "./pages/ConnectWallet";
import Articles from "./pages/Articles";
import PublishArticle from "./pages/PublishArticle";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="writestream-ui-theme">
      <WalletProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<ConnectWallet />} />
              <Route
                path="/articles"
                element={
                  <PrivateRoute>
                    <Articles />
                  </PrivateRoute>
                }
              />
              <Route
                path="/publish"
                element={
                  <PrivateRoute>
                    <PublishArticle />
                  </PrivateRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </WalletProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
