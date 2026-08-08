import type { Metadata } from "next";
import Dashboard from "./Dashboard";

export const metadata: Metadata = { title: "ParabelluM • Controle da CP", description: "Adena, equipamentos e cristais da CP ParabelluM." };
export default function Home() { return <Dashboard />; }
