"use client";

import type React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, Trash2, List } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Tournament } from "@/app/page";

interface TournamentListProps {
  tournaments: Tournament[];
  onTournamentOpen: (tournament: Tournament) => void;
  onTournamentsChange: () => void;
}

export default function TournamentList({
  tournaments,
  onTournamentOpen,
  onTournamentsChange,
}: TournamentListProps) {
  const deleteTournament = async (
    tournamentId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    if (
      !confirm(
        "Are you sure you want to delete this tournament? This action cannot be undone."
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("tournaments")
      .delete()
      .eq("id", tournamentId);

    if (error) {
      console.error("Error deleting tournament:", error);
      return;
    }

    onTournamentsChange();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (tournaments.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No tournaments yet
          </h3>
          <p className="text-gray-500">
            Create your first tournament to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
        Daftar Turnamen
      </h2>
      <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((tournament) => (
          <Card
            key={tournament.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onTournamentOpen(tournament)}
          >
            <CardHeader className="pb-2 md:pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {tournament.type === "league" ? (
                    <List className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                  ) : (
                    <Trophy className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                  )}
                  <Badge
                    variant="outline"
                    className="capitalize text-xs md:text-sm"
                  >
                    {tournament.type}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => deleteTournament(tournament.id, e)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 md:h-8 md:w-8 p-0"
                >
                  <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
              <CardTitle className="text-base md:text-lg line-clamp-2">
                {tournament.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 md:pt-3">
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs md:text-sm text-gray-600">
                    Status
                  </span>
                  <Badge
                    className={`text-xs md:text-sm ${getStatusColor(
                      tournament.status
                    )}`}
                  >
                    {tournament.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                  <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                  <span>{formatDate(tournament.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
