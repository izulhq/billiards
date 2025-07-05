"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trophy, Users, Plus, List, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ParticipantManager from "@/components/participant-manager";
import TournamentSchedule from "@/components/tournament-schedule";
import TournamentList from "@/components/tournament-list";
import Statistics from "@/components/statistics";
import { supabase } from "@/lib/supabase";

export type TournamentType = "league" | "cup";

export type PlayerProfile = {
  id: string;
  name: string;
  profile_image?: string | null;
  total_matches_played: number;
  total_wins: number;
  total_losses: number;
  total_points: number;
  created_at: string;
  updated_at: string;
};

export type Player = {
  id: string;
  tournament_id: string;
  name: string;
  points: number;
  played: number;
  won: number;
  lost: number;
  profile_id?: string | null;
  profile?: PlayerProfile | null;
};

export type Match = {
  id: number; // Changed from string to number
  tournament_id: string;
  round: number;
  match_number?: number | null;
  home_player_id: string;
  away_player_id: string;
  home_score?: number | null;
  away_score?: number | null;
  winner_id?: string | null;
  completed: boolean;
};

export type Tournament = {
  id: string;
  name: string;
  type: TournamentType;
  status: "active" | "completed" | "paused";
  created_at: string;
  updated_at: string;
};

export default function Home() {
  const [currentStep, setCurrentStep] = useState<
    "list" | "statistics" | "select" | "participants" | "tournament"
  >("list");
  const [tournamentType, setTournamentType] =
    useState<TournamentType>("league");
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(
    null
  );
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading tournaments:", error);
        return;
      }

      setTournaments(data || []);
    } catch (error) {
      console.error("Error loading tournaments:", error);
    }
  };

  const handleTournamentSelect = (type: TournamentType) => {
    setTournamentType(type);
    setCurrentStep("participants");
  };

  const handleTournamentCreated = (tournament: Tournament) => {
    setCurrentTournament(tournament);
    setCurrentStep("tournament");
    loadTournaments();
  };

  const handleTournamentOpen = (tournament: Tournament) => {
    setCurrentTournament(tournament);
    setTournamentType(tournament.type);
    setCurrentStep("tournament");
  };

  const resetToList = () => {
    setCurrentStep("list");
    setCurrentTournament(null);
  };

  if (currentStep === "list") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-6xl mx-auto pt-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <h1 className="text-4xl font-bold text-gray-900">
                GSE BILYAT JINGGG !!!
              </h1>
            </div>
          </div>

          <div className="flex justify-center mb-8 space-x-4">
            <Button
              onClick={() => setCurrentStep("select")}
              size="lg"
              className="px-8 bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Plus className="h-5 w-5 mr-2" />
              Buat Turnamen
            </Button>
            <Button
              onClick={() => setCurrentStep("statistics")}
              size="lg"
              className="px-8 bg-white hover:bg-gray-100 text-gray-800 border border-gray-600"
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              Statistik
            </Button>
          </div>

          <TournamentList
            tournaments={tournaments}
            onTournamentOpen={handleTournamentOpen}
            onTournamentsChange={loadTournaments}
          />
        </div>
      </div>
    );
  }

  if (currentStep === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-3 md:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <div className="flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 md:h-12 md:w-12 text-green-600 mr-2 md:mr-3" />
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900">
                Buat Turnamen
              </h1>
            </div>
            <p className="text-lg md:text-xl text-gray-600">
              Pilih Format Turnamen
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:gap-8 max-w-2xl mx-auto">
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleTournamentSelect("league")}
            >
              <CardHeader className="text-center">
                <Users className="h-12 w-12 md:h-16 md:w-16 text-blue-600 mx-auto mb-4" />
                <CardTitle className="text-xl md:text-2xl">
                  League Tournament
                </CardTitle>
                <CardDescription className="text-sm md:text-base">
                  Round-robin format where every player plays against every
                  other player
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs md:text-sm text-gray-600">
                  <li>• Fair scheduling system</li>
                  <li>• 3 points for win, 0 for loss</li>
                  <li>• Home/Away rotation</li>
                  <li>• Complete standings table</li>
                </ul>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleTournamentSelect("cup")}
            >
              <CardHeader className="text-center">
                <Trophy className="h-12 w-12 md:h-16 md:w-16 text-green-600 mx-auto mb-4" />
                <CardTitle className="text-xl md:text-2xl">
                  Cup Tournament
                </CardTitle>
                <CardDescription className="text-sm md:text-base">
                  Knockout format with elimination rounds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs md:text-sm text-gray-600">
                  <li>• Single elimination</li>
                  <li>• Bracket-style progression</li>
                  <li>• Home/Away for each match</li>
                  <li>• Winner takes all</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-6 md:mt-8">
            <Button variant="outline" onClick={() => setCurrentStep("list")}>
              Back to Tournaments
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "statistics") {
    return <Statistics onBack={() => setCurrentStep("list")} />;
  }

  if (currentStep === "participants") {
    return (
      <ParticipantManager
        tournamentType={tournamentType}
        onTournamentCreated={handleTournamentCreated}
        onBack={() => setCurrentStep("select")}
      />
    );
  }

  return (
    <TournamentSchedule tournament={currentTournament!} onReset={resetToList} />
  );
}
