import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { EmptyState } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";

/**
 * Shared shell for account-scoped pages. These become real, data-backed
 * screens once authentication and orders land in a later phase.
 */
export function AccountPlaceholder({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <SiteLayout>
      <div className="container-page py-10">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        <div className="mt-6">
          <EmptyState
            icon={icon}
            title={description}
            description="Sign-in, orders and saved items connect to your CampusCart account in the next phase."
            action={
              <Button asChild variant="outline">
                <Link to="/products">Browse products</Link>
              </Button>
            }
          />
        </div>
      </div>
    </SiteLayout>
  );
}
