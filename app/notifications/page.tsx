import { Sidebar } from "@/components/layout/sidebar"

export default function NotificationsPage() {
	return (
		<div className="min-h-screen bg-background">
			<Sidebar />
			<main className="pl-64 min-h-screen flex items-center justify-center">
				<div className="p-6 w-full max-w-3xl">
					<div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 text-center">
						<strong>Work In Progress:</strong> This section is under development.
					</div>

					<h1 className="mt-6 text-2xl font-semibold text-center">Notifications</h1>
					<p className="mt-2 text-muted-foreground text-center">System alerts and messages will appear here.</p>
				</div>
			</main>
		</div>
	)
}

