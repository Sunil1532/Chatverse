import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Chat from './pages/RoomPage';
import ChatPage from './pages/ChatPage';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/chat"
        element={
          isAuthenticated ? <Chat /> : <Navigate to="/auth" replace />
        }
      />
       <Route path="/chat/:roomId" element={<ChatPage />} />
    </Routes>
  );
}

export default App;
