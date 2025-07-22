"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Trophy,
  RotateCcw,
  Home,
  Plane,
  Crown,
  Edit3,
  ArrowLeft,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Player, Match, Tournament } from "@/app/page";
import MatchCard from "@/components/match-card";
import StandingsTable from "@/components/standings-table";
import { supabase } from "@/lib/supabase";
import { Separator } from "@radix-ui/react-select";

interface TournamentScheduleProps {
  tournament: Tournament & { home_away_enabled?: boolean };
  onReset: () => void;
}

export default function TournamentSchedule({
  tournament,
  onReset,
}: TournamentScheduleProps) {
  const homeAwayEnabled = tournament.home_away_enabled ?? true;
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 10;

  useEffect(() => {
    loadTournamentData();
  }, [tournament.id]);

  const loadTournamentData = async () => {
    setLoading(true);

    try {
      // Load players with their profiles
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select(
          `
          *,
          profile:player_profiles(*)
        `
        )
        .eq("tournament_id", tournament.id)
        .order("name");

      if (playersError) throw playersError;

      // Load matches
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("match_number", { ascending: true });

      if (matchesError) throw matchesError;

      setPlayers(playersData || []);

      if (matchesData && matchesData.length > 0) {
        setMatches(matchesData);
      } else {
        // Generate schedule if no matches exist
        const schedule = generateFairSchedule(
          playersData || [],
          homeAwayEnabled
        );

        if (schedule.length > 0) {
          const { data: insertedMatches, error: insertError } = await supabase
            .from("matches")
            .insert(
              schedule.map((match, index) => ({
                tournament_id: tournament.id,
                round: 1,
                match_number: index + 1,
                home_player_id: match.home_player_id,
                away_player_id: match.away_player_id,
                completed: false,
              }))
            )
            .select();

          if (!insertError && insertedMatches) {
            setMatches(insertedMatches);
          }
        }
      }
    } catch (error) {
      console.error("Error loading tournament data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fair scheduling algorithm that distributes matches evenly
  const generateFairSchedule = (
    playerList: Player[],
    homeAwayEnabled: boolean
  ): Omit<Match, "id">[] => {
    const schedule: Omit<Match, "id">[] = [];
    const n = playerList.length;
    let matchNumber = 1;

    // Create all possible pairings
    const allPairings: Array<{
      player1: Player;
      player2: Player;
      isFirstMeeting: boolean;
    }> = [];

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        // First meeting (player i is home)
        allPairings.push({
          player1: playerList[i],
          player2: playerList[j],
          isFirstMeeting: true,
        });

        // Second meeting if home/away enabled (player j is home)
        if (homeAwayEnabled) {
          allPairings.push({
            player1: playerList[j],
            player2: playerList[i],
            isFirstMeeting: false,
          });
        }
      }
    }

    // Fair distribution algorithm
    const playerLastMatch: { [key: string]: number } = {};
    playerList.forEach((player) => {
      playerLastMatch[player.id] = -999; // Start with very low number
    });

    const remainingPairings = [...allPairings];

    while (remainingPairings.length > 0) {
      let bestPairingIndex = -1;
      let bestScore = -999999;

      // Find the pairing where both players have waited the longest
      for (let i = 0; i < remainingPairings.length; i++) {
        const pairing = remainingPairings[i];
        const player1LastMatch = playerLastMatch[pairing.player1.id];
        const player2LastMatch = playerLastMatch[pairing.player2.id];

        // Score is based on how long both players have waited
        const waitTime1 = matchNumber - player1LastMatch;
        const waitTime2 = matchNumber - player2LastMatch;
        const score =
          Math.min(waitTime1, waitTime2) * 1000 + (waitTime1 + waitTime2);

        if (score > bestScore) {
          bestScore = score;
          bestPairingIndex = i;
        }
      }

      if (bestPairingIndex >= 0) {
        const selectedPairing = remainingPairings[bestPairingIndex];

        const match: Omit<Match, "id"> = {
          tournament_id: tournament.id,
          round: 1,
          home_player_id: selectedPairing.player1.id,
          away_player_id: selectedPairing.player2.id,
          completed: false,
        };

        schedule.push(match);

        // Update last match for both players
        playerLastMatch[selectedPairing.player1.id] = matchNumber;
        playerLastMatch[selectedPairing.player2.id] = matchNumber;

        // Remove the scheduled pairing
        remainingPairings.splice(bestPairingIndex, 1);
        matchNumber++;
      } else {
        break; // Safety break
      }
    }

    return schedule;
  };

  const updateMatchResult = async (matchId: number, winnerId: string) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    const loserId =
      winnerId === match.home_player_id
        ? match.away_player_id
        : match.home_player_id;

    try {
      // Update match in database
      const { error: matchError } = await supabase
        .from("matches")
        .update({
          winner_id: winnerId,
          completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchId);

      if (matchError) throw matchError;

      // Update player statistics
      const winner = players.find((p) => p.id === winnerId);
      const loser = players.find((p) => p.id === loserId);

      if (winner && loser) {
        // Update winner
        const { error: winnerError } = await supabase
          .from("players")
          .update({
            points: winner.points + 3,
            played: winner.played + 1,
            won: winner.won + 1,
          })
          .eq("id", winner.id);

        if (winnerError) throw winnerError;

        // Update loser
        const { error: loserError } = await supabase
          .from("players")
          .update({
            played: loser.played + 1,
            lost: loser.lost + 1,
          })
          .eq("id", loser.id);

        if (loserError) throw loserError;
      }

      // Reload tournament data
      loadTournamentData();

      // Check if tournament should be marked as complete
      checkAndUpdateTournamentStatus();
    } catch (error) {
      console.error("Error updating match result:", error);
    }
  };

  const editMatchResult = async (matchId: number, newWinnerId: string) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match || !match.completed) return;

    try {
      // Get the current winner and loser
      const currentWinner = players.find((p) => p.id === match.winner_id);
      const currentLoser = players.find(
        (p) =>
          p.id ===
          (match.winner_id === match.home_player_id
            ? match.away_player_id
            : match.home_player_id)
      );

      // Get the new winner and loser
      const newWinner = players.find((p) => p.id === newWinnerId);
      const newLoser = players.find(
        (p) =>
          p.id ===
          (newWinnerId === match.home_player_id
            ? match.away_player_id
            : match.home_player_id)
      );

      // If the winner is the same, no need to update
      if (match.winner_id === newWinnerId) return;

      // Update match in database
      const { error: matchError } = await supabase
        .from("matches")
        .update({
          winner_id: newWinnerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchId);

      if (matchError) throw matchError;

      // Update player statistics
      if (currentWinner && currentLoser && newWinner && newLoser) {
        // Revert stats for current winner (subtract points and won)
        const { error: currentWinnerError } = await supabase
          .from("players")
          .update({
            points: Math.max(0, currentWinner.points - 3),
            won: Math.max(0, currentWinner.won - 1),
          })
          .eq("id", currentWinner.id);

        if (currentWinnerError) throw currentWinnerError;

        // Revert stats for current loser (subtract lost)
        const { error: currentLoserError } = await supabase
          .from("players")
          .update({
            lost: Math.max(0, currentLoser.lost - 1),
          })
          .eq("id", currentLoser.id);

        if (currentLoserError) throw currentLoserError;

        // Apply stats for new winner (add points and won)
        const { error: newWinnerError } = await supabase
          .from("players")
          .update({
            points: newWinner.points + 3,
            won: newWinner.won + 1,
          })
          .eq("id", newWinner.id);

        if (newWinnerError) throw newWinnerError;

        // Apply stats for new loser (add lost)
        const { error: newLoserError } = await supabase
          .from("players")
          .update({
            lost: newLoser.lost + 1,
          })
          .eq("id", newLoser.id);

        if (newLoserError) throw newLoserError;
      }

      // Reload tournament data
      loadTournamentData();

      // Check if tournament should be marked as complete
      checkAndUpdateTournamentStatus();
    } catch (error) {
      console.error("Error editing match result:", error);
    }
  };

  const getCompletedMatches = () => {
    return matches.filter((match) => match.completed);
  };

  const getUpcomingMatches = () => {
    return matches.filter((match) => !match.completed);
  };

  // Pagination helpers
  const getPaginatedUpcomingMatches = () => {
    const upcomingMatches = getUpcomingMatches();
    const startIndex = (currentPage - 1) * matchesPerPage;
    const endIndex = startIndex + matchesPerPage;
    return upcomingMatches.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const upcomingMatches = getUpcomingMatches();
    return Math.ceil(upcomingMatches.length / matchesPerPage);
  };

  const goToNextPage = () => {
    if (currentPage < getTotalPages()) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Reset to first page when matches change
  useEffect(() => {
    setCurrentPage(1);
  }, [matches]);

  // Check if tournament is complete (all matches finished)
  const isTournamentComplete = () => {
    return matches.length > 0 && getUpcomingMatches().length === 0;
  };

  // Manually mark tournament as completed
  const markTournamentComplete = async () => {
    if (
      !confirm(
        "Are you sure you want to mark this tournament as completed? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("tournaments")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", tournament.id);

      if (error) throw error;

      // Trigger parent component to refresh or show success message
      window.location.reload(); // Simple approach - you could improve this
    } catch (error) {
      console.error("Error marking tournament as complete:", error);
    }
  };

  // Automatically check and update tournament status after each match
  const checkAndUpdateTournamentStatus = async () => {
    if (isTournamentComplete() && tournament.status === "active") {
      try {
        const { error } = await supabase
          .from("tournaments")
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", tournament.id);

        if (error) throw error;
      } catch (error) {
        console.error("Error auto-updating tournament status:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tournament...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-between mb-4">
          <div className="flex flex-row justify-between items-center w-full mb-4">
            <a
              className="font-bold text-gray-900 capitalize flex items-center text-xl sm:text-3xl"
              href="/"
            >
              <Trophy className="h-8 w-8 mr-3 text-blue-600" />
              {tournament.name}
            </a>
            <div className="flex space-x-2 justify-end items-center">
              <Button
                variant="outline"
                onClick={onReset}
                className="bg-white hover:bg-blue-500 text-blue-600 hover:text-white text-xs sm:text-sm"
              >
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <Button
                onClick={onReset}
                variant="outline"
                className="bg-blue-500 text-white hover:bg-blue-600 hover:text-white shadow-sm text-xs sm:text-sm"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Create New</span>
              </Button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center space-x-8 border border-gray-200 text-gray-600 bg-white p-2 rounded-md shadow-sm w-full">
            <Badge
              className={`
                  ${
                    tournament.status === "completed"
                      ? "bg-green-500 hover:bg-green-600"
                      : tournament.status === "active"
                      ? "bg-blue-500 hover:bg-blue-600"
                      : "bg-gray-500 hover:bg-gray-600"
                  }
                `}
            >
              {tournament.status.charAt(0).toUpperCase() +
                tournament.status.slice(1)}
            </Badge>
            <p className="flex text-center">
              <strong className="text-black">
                {tournament.type.charAt(0).toUpperCase() +
                  tournament.type.slice(1)}{" "}
              </strong>
              &nbsp;Tournament
            </p>
            <p className="flex text-center">
              <strong className="text-black">{players.length}</strong>
              &nbsp;Players
            </p>
            <p className="flex text-center">
              <strong className="text-black">{matches.length}</strong>
              &nbsp;Total Matches
            </p>
            {homeAwayEnabled && (
              <p className="flex text-center">
                <span className="inline-flex items-center justify-center gap-1 font-semibold text-black">
                  <Home className="h-4 w-4 text-blue-600" />
                  <Plane className="h-4 w-4 text-green-600" />
                  &nbsp;Home/Away
                </span>
              </p>
            )}{" "}
          </div>

          {/* Tournament completion section */}
          {tournament.status === "active" && (
            <div className="text-center w-full">
              {isTournamentComplete() ? (
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-2 sm:pl-4 mt-4 flex flex-col sm:flex-row items-center justify-between">
                  <p className="text-blue-800 mb-2 sm:mb-0 text-sm sm:text-base">
                    <strong>🎉 All matches completed!</strong> Tournament is
                    ready to be marked as finished
                  </p>
                  <Button
                    onClick={markTournamentComplete}
                    className="bg-blue-500 hover:bg-blue-600 text-xs sm:text-sm w-full sm:w-auto"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Mark Tournament Complete
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={markTournamentComplete}
                  variant="outline"
                  className="mb-4 text-orange-600 border-orange-300 hover:bg-orange-50 text-xs sm:text-sm w-full sm:w-auto mt-2"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Mark as Complete (Force)
                </Button>
              )}
            </div>
          )}
        </div>

        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 shadow-sm">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="standings">Standings</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">
            <div className="p-4 bg-white rounded-md shadow-sm border border-gray-200 text-center sm:text-start">
              <h3 className="text-md sm:text-lg font-semibold">
                Upcoming Matches ({getUpcomingMatches().length} remaining)
              </h3>
              <p className="text-gray-600 text-sm sm:text-md">
                Total matches in tournament: {matches.length}{" "}
                <span className="hidden sm:inline">|</span>
                <br className="inline sm:hidden"></br>Completed:{" "}
                {getCompletedMatches().length}
              </p>
              {getTotalPages() > 1 && (
                <p className="text-gray-500 text-sm mt-2">
                  Page {currentPage} of {getTotalPages()}
                </p>
              )}
            </div>

            <div className="grid gap-4">
              {getPaginatedUpcomingMatches().map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  players={players}
                  onUpdateResult={updateMatchResult}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {getTotalPages() > 1 && (
              <div className="flex justify-center items-center gap-4 py-4">
                <Button
                  variant="outline"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {(currentPage - 1) * matchesPerPage + 1} -{" "}
                    {Math.min(
                      currentPage * matchesPerPage,
                      getUpcomingMatches().length
                    )}{" "}
                    of {getUpcomingMatches().length} matches
                  </span>
                </div>

                <Button
                  variant="outline"
                  onClick={goToNextPage}
                  disabled={currentPage === getTotalPages()}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {getUpcomingMatches().length === 0 && matches.length > 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Trophy className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Tournament Complete!
                  </h3>
                  <p className="text-gray-500">
                    All matches have been played. Check the standings for final
                    results.
                  </p>
                </CardContent>
              </Card>
            )}

            {matches.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">No matches scheduled yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="standings">
            <StandingsTable players={players} />
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {getCompletedMatches().length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">No completed matches yet</p>
                </CardContent>
              </Card>
            ) : (
              getCompletedMatches().map((match) => (
                <Card key={match.id}>
                  <CardContent className="p-4">
                    {/* Desktop layout */}
                    <div className="hidden md:flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary">
                          Match #{match.match_number || match.id}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-blue-600" />
                          <span
                            className={`font-medium ${
                              match.winner_id === match.home_player_id
                                ? "text-green-600 font-bold"
                                : "text-gray-500"
                            }`}
                          >
                            {
                              players.find((p) => p.id === match.home_player_id)
                                ?.name
                            }
                          </span>
                          {match.winner_id === match.home_player_id && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <span className="text-gray-400">vs</span>
                        <div className="flex items-center gap-2">
                          {match.winner_id === match.away_player_id && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                          <span
                            className={`font-medium ${
                              match.winner_id === match.away_player_id
                                ? "text-green-600 font-bold"
                                : "text-gray-500"
                            }`}
                          >
                            {
                              players.find((p) => p.id === match.away_player_id)
                                ?.name
                            }
                          </span>
                          <Plane className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="default"
                          className="bg-blue-500 shadow-sm hover:bg-blue-600"
                        >
                          Winner:{" "}
                          {players.find((p) => p.id === match.winner_id)?.name}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-black hover:text-blue-700 hover:bg-blue-50 shadow-sm"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() =>
                                editMatchResult(match.id, match.home_player_id)
                              }
                              className={
                                match.winner_id === match.home_player_id
                                  ? "bg-green-50 font-medium"
                                  : ""
                              }
                            >
                              <Home className="h-4 w-4 mr-2 text-blue-600" />
                              {
                                players.find(
                                  (p) => p.id === match.home_player_id
                                )?.name
                              }
                              {match.winner_id === match.home_player_id && (
                                <Crown className="h-4 w-4 ml-2 text-yellow-500" />
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                editMatchResult(match.id, match.away_player_id)
                              }
                              className={
                                match.winner_id === match.away_player_id
                                  ? "bg-green-50 font-medium"
                                  : ""
                              }
                            >
                              <Plane className="h-4 w-4 mr-2 text-green-600" />
                              {
                                players.find(
                                  (p) => p.id === match.away_player_id
                                )?.name
                              }
                              {match.winner_id === match.away_player_id && (
                                <Crown className="h-4 w-4 ml-2 text-yellow-500" />
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Mobile layout - matches the attached image */}
                    <div className="md:hidden space-y-3">
                      {/* Top row: Match badge and edit button */}
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-sm">
                          Match #{match.match_number || match.id}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-black hover:text-blue-700 hover:bg-blue-50 shadow-sm"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="mr-2">
                            <DropdownMenuItem
                              onClick={() =>
                                editMatchResult(match.id, match.home_player_id)
                              }
                              className={
                                match.winner_id === match.home_player_id
                                  ? "bg-green-50 font-medium"
                                  : ""
                              }
                            >
                              <Home className="h-4 w-4 mr-2 text-blue-600" />
                              {
                                players.find(
                                  (p) => p.id === match.home_player_id
                                )?.name
                              }
                              {match.winner_id === match.home_player_id && (
                                <Crown className="h-4 w-4 ml-2 text-yellow-500" />
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                editMatchResult(match.id, match.away_player_id)
                              }
                              className={
                                match.winner_id === match.away_player_id
                                  ? "bg-green-50 font-medium"
                                  : ""
                              }
                            >
                              <Plane className="h-4 w-4 mr-2 text-green-600" />
                              {
                                players.find(
                                  (p) => p.id === match.away_player_id
                                )?.name
                              }
                              {match.winner_id === match.away_player_id && (
                                <Crown className="h-4 w-4 ml-2 text-yellow-500" />
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Middle row: Players with winner/loser indication on single line */}
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Home className="h-6 w-6 text-blue-600" />
                          <span
                            className={`font-medium text-xl ${
                              match.winner_id === match.home_player_id
                                ? "text-blue-600 font-bold"
                                : "text-red-500"
                            }`}
                          >
                            {
                              players.find((p) => p.id === match.home_player_id)
                                ?.name
                            }
                          </span>
                          {match.winner_id === match.home_player_id && (
                            <span className="text-blue-600 text-xl font-bold">
                              (W)
                            </span>
                          )}
                          {match.winner_id !== match.home_player_id &&
                            match.winner_id === match.away_player_id && (
                              <span className="text-red-500 text-xl">(L)</span>
                            )}
                        </div>

                        <span className="text-black text-xl">vs</span>

                        <div className="flex items-center gap-1">
                          {match.winner_id === match.away_player_id && (
                            <span className="text-blue-600 text-xl font-bold">
                              (W)
                            </span>
                          )}
                          {match.winner_id !== match.away_player_id &&
                            match.winner_id === match.home_player_id && (
                              <span className="text-red-500 text-xl">(L)</span>
                            )}
                          <span
                            className={`font-medium text-xl ${
                              match.winner_id === match.away_player_id
                                ? "text-blue-600 font-bold"
                                : "text-red-500"
                            }`}
                          >
                            {
                              players.find((p) => p.id === match.away_player_id)
                                ?.name
                            }
                          </span>
                          <Plane className="h-6 w-6 text-green-600" />
                        </div>
                      </div>

                      {/* Bottom row: Winner button */}
                      <div className="flex justify-center">
                        <Badge
                          variant="default"
                          className="bg-blue-500 text-white px-4 py-2 text-sm"
                        >
                          Winner:{" "}
                          {players.find((p) => p.id === match.winner_id)?.name}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
