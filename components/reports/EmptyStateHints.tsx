import Link from "next/link";

type Variant =
  | "no-entries"
  | "no-clients"
  | "no-services-for-client"
  | "no-tasks-for-service";

interface Props {
  variant: Variant;
  clientId?: string;
  serviceId?: string;
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-500"
    >
      <path d="M12 9v4M12 17h.01" />
      <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" />
    </svg>
  );
}

export default function EmptyStateHints({ variant, clientId, serviceId }: Props) {
  if (variant === "no-clients") {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800/30 px-4 py-3">
        <InfoIcon />
        <p className="text-sm">
          <span className="font-medium text-zinc-300">No clients found.</span>{" "}
          <Link
            href="/clients"
            className="text-lime-400 underline underline-offset-2 hover:text-lime-300"
          >
            Add a client
          </Link>{" "}
          <span className="text-zinc-500">to start logging time.</span>
        </p>
      </div>
    );
  }

  if (variant === "no-services-for-client") {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800/30 px-4 py-3">
        <InfoIcon />
        <p className="text-sm">
          <span className="font-medium text-zinc-300">
            No services attached to this client.
          </span>{" "}
          {clientId ? (
            <>
              <Link
                href={`/clients/${clientId}`}
                className="text-lime-400 underline underline-offset-2 hover:text-lime-300"
              >
                Open client profile
              </Link>{" "}
              <span className="text-zinc-500">to attach services.</span>
            </>
          ) : (
            <span className="text-zinc-500">Go to the client profile to attach services.</span>
          )}
        </p>
      </div>
    );
  }

  if (variant === "no-tasks-for-service") {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800/30 px-4 py-3">
        <InfoIcon />
        <p className="text-sm">
          <span className="font-medium text-zinc-300">
            No tasks found for this service.
          </span>{" "}
          {serviceId ? (
            <>
              <Link
                href={`/tasks?serviceId=${serviceId}`}
                className="text-lime-400 underline underline-offset-2 hover:text-lime-300"
              >
                Create tasks
              </Link>{" "}
              <span className="text-zinc-500">for this service first.</span>
            </>
          ) : (
            <span className="text-zinc-500">
              Go to Tasks to create tasks for this service.
            </span>
          )}
        </p>
      </div>
    );
  }

  if (variant === "no-entries") {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-zinc-700/60 bg-[#1c212b] py-12">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-6 w-6 text-zinc-500"
            >
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-400">No time entries yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Add your first entry using the form above.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
