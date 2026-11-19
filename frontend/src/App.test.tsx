import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, test } from "vitest";
import { AppRoutes, createQueryClient } from "./App";

function renderAt(path: string) {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test.each([
  ["/", "Dashboard"],
  ["/organizations", "Organizations"],
  ["/contacts", "Contacts"],
  ["/deals", "Deals"],
  ["/pipeline", "Pipeline"],
])("%s shows the %s page with the sidebar", (path, title) => {
  renderAt(path);
  expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: title })).toHaveClass("active");
});
