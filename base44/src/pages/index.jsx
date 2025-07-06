import Layout from "./Layout.jsx";
import LiveopSimulator from "./LiveopSimulator";
import LayoutGeneratorSimulator from "../components/simulator/LayoutGeneratorSimulator";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

function PagesContent() {
    return (
        <Layout>
            <Routes>            
                    <Route path="/" element={<LiveopSimulator />} />
                <Route path="/LiveopSimulator" element={<LiveopSimulator />} />
                <Route path="/LayoutGeneratorSimulator" element={<LayoutGeneratorSimulator />} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}