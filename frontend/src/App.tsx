import { Routes, Route } from 'react-router-dom';
import Metaconnect from './pages/metaConnect';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Metaconnect />}>
      </Route>
    </Routes>
  );
}

export default App;