import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Film,
    Building2,
    Clapperboard,
    BarChart3,
    ArrowRight,
    Ticket,
    Megaphone,
    Gift,
} from "lucide-react";
import { FileUser } from "@/components/icons";

export default function AdminWelcome() {
    return (
        <main className="px-6 py-8 md:px-10 lg:px-16">
            {/* Page Header */}
            <section className="flex flex-col gap-0 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Welcome to Ruhunu</h1>
                </div>
            </section>
        </main>
    );
}
