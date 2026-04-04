import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Navbar from './components/layout/Navbar'
import Home from './pages/Home'
import Standings from './pages/Standings'
import Players from './pages/Players'
import PlayerDetail from './pages/PlayerDetail'
import TeamDetail from './pages/TeamDetail'
import Predictions from './pages/Predictions'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    }
  }
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-navy text-white">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/standings" element={<Standings />} />
              <Route path="/fixtures" element={<Navigate to="/" replace />} />
              <Route path="/players" element={<Players />} />
              <Route path="/players/:id" element={<PlayerDetail />} />
              <Route path="/teams/:teamShort" element={<TeamDetail />} />
              <Route path="/predictions" element={<Predictions />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
