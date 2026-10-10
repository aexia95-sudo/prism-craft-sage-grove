import { createFileRoute } from "@tanstack/react-router";
import { BeaconApp } from "@/components/beacon-app";

export const Route = createFileRoute("/")({ component: BeaconApp });
