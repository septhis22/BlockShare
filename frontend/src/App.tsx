import { Routes, Route } from 'react-router-dom';
import WriteOnBlock from './components/writeOnBlock';
import RegistryUploader from './pages/RegistryUploader';

function App() {
  return (
    <Routes>
      {/* <Route path="/" element={<WriteOnBlock />}></Route> */}
      <Route path="/" element={<RegistryUploader />}></Route>
    </Routes>
  );
}

export default App;