import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRouter from './routes/AppRouter';
import NotificationBootstrap from './components/NotificationBootstrap';
import ChatWidget from './components/chat/ChatWidget';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationBootstrap />
      <AppRouter />
      <ChatWidget />
    </QueryClientProvider>
  );
}
