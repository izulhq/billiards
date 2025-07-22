"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  BarChart3,
  Trophy,
  Target,
  TrendingUp,
  User,
  ChevronUp,
  ChevronDown,
  Users,
  Swords,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { PlayerProfile } from "@/app/page";

interface HeadToHeadRecord {
  opponent_id: string;
  opponent_name: string;
  opponent_image?: string;
  wins: number;
  losses: number;
  total_matches: number;
  win_rate: number;
}

interface StatisticsProps {
  onBack: () => void;
}

export default function Statistics({ onBack }: StatisticsProps) {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<
    "points" | "matches" | "wins" | "winRate" | "rank"
  >("points");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentView, setCurrentView] = useState<
    "overall" | "head-to-head" | "player-selection"
  >("overall");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfile | null>(
    null
  );
  const [headToHeadData, setHeadToHeadData] = useState<HeadToHeadRecord[]>([]);

  useEffect(() => {
    loadPlayerStatistics();
  }, []);

  const loadPlayerStatistics = async () => {
    setLoading(true);
    try {
      // First, update all statistics
      await supabase.rpc("update_player_profile_statistics");

      // Then load the updated data
      const { data, error } = await supabase
        .from("player_profiles")
        .select("*")
        .order("total_points", { ascending: false });

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error("Error loading player statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadHeadToHeadData = async (playerId: string) => {
    try {
      setLoading(true);

      // Get the selected player's profile to get their name
      const selectedPlayerProfile = players.find((p) => p.id === playerId);
      if (!selectedPlayerProfile) {
        setHeadToHeadData([]);
        return;
      }

      // Get all other players from player_profiles table
      const { data: allPlayersData, error: playersError } = await supabase
        .from("player_profiles")
        .select("*")
        .neq("id", playerId);

      if (playersError) throw playersError;

      // Get all matches where the selected player participated (using player name)
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(
          `
          *,
          home_player:players!matches_home_player_id_fkey(
            id,
            name,
            profile_id
          ),
          away_player:players!matches_away_player_id_fkey(
            id,
            name,
            profile_id
          )
        `
        )
        .eq("completed", true);

      if (matchesError) throw matchesError;

      // Filter matches where the selected player participated (by name)
      const playerMatches =
        matchesData?.filter(
          (match) =>
            match.home_player?.name === selectedPlayerProfile.name ||
            match.away_player?.name === selectedPlayerProfile.name
        ) || [];

      // Create head-to-head records for all players
      const headToHeadRecords: HeadToHeadRecord[] = [];

      allPlayersData?.forEach((opponent) => {
        // Calculate wins and losses against this opponent
        const matchesAgainstOpponent = playerMatches.filter((match) => {
          const isHomePlayer =
            match.home_player?.name === selectedPlayerProfile.name;
          const opponentName = isHomePlayer
            ? match.away_player?.name
            : match.home_player?.name;
          return opponentName === opponent.name;
        });

        let wins = 0;
        let losses = 0;

        matchesAgainstOpponent.forEach((match) => {
          const playerIsHome =
            match.home_player?.name === selectedPlayerProfile.name;
          const playerPlayerId = playerIsHome
            ? match.home_player_id
            : match.away_player_id;

          if (match.winner_id === playerPlayerId) {
            wins++;
          } else {
            losses++;
          }
        });

        const totalMatches = wins + losses;
        const winRate =
          totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

        headToHeadRecords.push({
          opponent_id: opponent.id,
          opponent_name: opponent.name,
          opponent_image: opponent.profile_image,
          wins,
          losses,
          total_matches: totalMatches,
          win_rate: winRate,
        });
      });

      // Sort by total matches played (most active matchups first), then by win rate
      const sortedRecords = headToHeadRecords.sort((a, b) => {
        if (b.total_matches !== a.total_matches) {
          return b.total_matches - a.total_matches;
        }
        return b.win_rate - a.win_rate;
      });

      setHeadToHeadData(sortedRecords);
    } catch (error) {
      console.error("Error loading head-to-head data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getWinRate = (wins: number, totalMatches: number) => {
    if (totalMatches === 0) return 0;
    return Math.round((wins / totalMatches) * 100);
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate < 10) return "bg-red-500 hover:bg-red-600";
    if (winRate < 20) return "bg-red-500 hover:bg-red-600";
    if (winRate < 30) return "bg-orange-500 hover:bg-orange-600";
    if (winRate < 40) return "bg-yellow-400 hover:bg-yellow-500";
    if (winRate < 50) return "bg-lime-500 hover:bg-lime-600";
    if (winRate < 60) return "bg-green-500 hover:bg-green-600";
    if (winRate < 70) return "bg-teal-500 hover:bg-teal-600";
    if (winRate < 80) return "bg-blue-500 hover:bg-blue-600";
    if (winRate < 90) return "bg-indigo-500 hover:bg-indigo-600";
    return "bg-purple-500 hover:bg-purple-600";
  };

  const getPlayerImageSrc = (player: PlayerProfile) => {
    if (player.profile_image) {
      if (player.profile_image.startsWith("/")) {
        return player.profile_image;
      }
      if (player.profile_image.startsWith("http")) {
        return player.profile_image;
      }
      return `/${player.profile_image}`;
    }
    return "/placeholder-user.jpg";
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "rank" ? "asc" : "desc"); // Rank should default to ascending
    }
  };

  const getSortedPlayers = () => {
    const sorted = [...players].sort((a, b) => {
      let valueA: number, valueB: number;

      switch (sortField) {
        case "points":
          valueA = a.total_points;
          valueB = b.total_points;
          break;
        case "matches":
          valueA = a.total_matches_played;
          valueB = b.total_matches_played;
          break;
        case "wins":
          valueA = a.total_wins;
          valueB = b.total_wins;
          break;
        case "winRate":
          valueA = getWinRate(a.total_wins, a.total_matches_played);
          valueB = getWinRate(b.total_wins, b.total_matches_played);
          break;
        case "rank":
          // For rank, we'll use points as the primary sort but in reverse
          valueA = a.total_points;
          valueB = b.total_points;
          break;
        default:
          valueA = a.total_points;
          valueB = b.total_points;
      }

      if (sortDirection === "asc") {
        return valueA - valueB;
      } else {
        return valueB - valueA;
      }
    });

    return sorted;
  };

  const SortButton = ({
    field,
    children,
  }: {
    field: typeof sortField;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:bg-gray-100 p-1 rounded transition-colors"
    >
      {children}
      <div className="flex flex-col">
        <ChevronUp
          className={`h-3 w-3 ${
            sortField === field && sortDirection === "asc"
              ? "text-blue-600"
              : "text-gray-300"
          }`}
        />
        <ChevronDown
          className={`h-3 w-3 -mt-1 ${
            sortField === field && sortDirection === "desc"
              ? "text-blue-600"
              : "text-gray-300"
          }`}
        />
      </div>
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-3 md:p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="h-6 w-6 md:h-8 md:w-8 mr-2 md:mr-3 text-blue-600" />
              {currentView === "overall" && "Player Statistics"}
              {currentView === "player-selection" && "Select Player"}
              {currentView === "head-to-head" &&
                `${selectedPlayer?.name} - Head to Head`}
            </h1>
            <p className="text-gray-600">
              {currentView === "overall" &&
                "Overall performance across all tournaments"}
              {currentView === "player-selection" &&
                "Choose a player to view head-to-head records"}
              {currentView === "head-to-head" &&
                "Performance against each opponent"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentView !== "overall" ? (
              <Button
                variant="ghost"
                onClick={() => {
                  if (currentView === "head-to-head") {
                    setCurrentView("player-selection");
                  } else {
                    setCurrentView("overall");
                  }
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white hover:text-white text-xs sm:text-md mr-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setCurrentView("player-selection")}
                className="bg-green-500 hover:bg-green-600 text-white hover:text-white text-xs sm:text-md mr-2"
              >
                <Swords className="h-4 w-4 mr-1" />
                Head to Head
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={onBack}
              className="bg-blue-500 hover:bg-blue-600 text-white hover:text-white text-xs sm:text-md"
            >
              <ArrowLeft className="h-4 w-4" />
              Exit
            </Button>
          </div>
        </div>

        {/* Player Selection View */}
        {currentView === "player-selection" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {players.map((player) => (
              <Card
                key={player.id}
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:bg-blue-50"
                onClick={() => {
                  setSelectedPlayer(player);
                  loadHeadToHeadData(player.id);
                  setCurrentView("head-to-head");
                }}
              >
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={getPlayerImageSrc(player)}
                        alt={player.name}
                      />
                      <AvatarFallback>
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{player.name}</h3>
                      <p className="text-sm text-gray-600">
                        {player.total_matches_played} total matches
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <div className="font-bold text-green-600">
                        {player.total_points}
                      </div>
                      <div className="text-gray-500">Points</div>
                    </div>
                    <div>
                      <div className="font-bold text-blue-600">
                        {player.total_wins}
                      </div>
                      <div className="text-gray-500">Wins</div>
                    </div>
                    <div>
                      <div className="font-bold text-gray-600">
                        {getWinRate(
                          player.total_wins,
                          player.total_matches_played
                        )}
                        %
                      </div>
                      <div className="text-gray-500">Win Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Head to Head View */}
        {currentView === "head-to-head" && selectedPlayer && (
          <>
            {/* Selected Player Info */}
            <Card className="mb-6">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={getPlayerImageSrc(selectedPlayer)}
                      alt={selectedPlayer.name}
                    />
                    <AvatarFallback>
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">{selectedPlayer.name}</h2>
                    <p className="text-gray-600">
                      {selectedPlayer.total_matches_played} total matches •{" "}
                      {selectedPlayer.total_wins}W -{" "}
                      {selectedPlayer.total_losses}L
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Head to Head Records */}
            {headToHeadData.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    No other players found
                  </h3>
                  <p className="text-gray-500">
                    There are no other players in the system to compare against
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {headToHeadData.map((record) => (
                  <Card
                    key={record.opponent_id}
                    className={record.total_matches === 0 ? "opacity-75" : ""}
                  >
                    <CardContent className="p-4">
                      {/* Desktop layout */}
                      <div className="hidden md:flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={
                                record.opponent_image
                                  ? record.opponent_image.startsWith("/")
                                    ? record.opponent_image
                                    : record.opponent_image.startsWith("http")
                                    ? record.opponent_image
                                    : `/${record.opponent_image}`
                                  : "/placeholder-user.jpg"
                              }
                              alt={record.opponent_name}
                            />
                            <AvatarFallback>
                              <User className="h-6 w-6" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {record.opponent_name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {record.total_matches === 0
                                ? "Never played"
                                : `${record.total_matches} matches played`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {record.wins}
                            </div>
                            <div className="text-sm text-gray-500">
                              {selectedPlayer.name} Wins
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                              {record.losses}
                            </div>
                            <div className="text-sm text-gray-500">
                              {selectedPlayer.name} Losses
                            </div>
                          </div>
                          <div className="text-center">
                            {record.total_matches === 0 ? (
                              <Badge
                                variant="secondary"
                                className="bg-gray-200 text-gray-600"
                              >
                                No matches
                              </Badge>
                            ) : (
                              <Badge
                                className={`${getWinRateColor(
                                  record.win_rate
                                )} text-white`}
                              >
                                {record.win_rate}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mobile layout */}
                      <div className="md:hidden">
                        <div className="flex items-center gap-3 mb-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={
                                record.opponent_image
                                  ? record.opponent_image.startsWith("/")
                                    ? record.opponent_image
                                    : record.opponent_image.startsWith("http")
                                    ? record.opponent_image
                                    : `/${record.opponent_image}`
                                  : "/placeholder-user.jpg"
                              }
                              alt={record.opponent_name}
                            />
                            <AvatarFallback>
                              <User className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">
                              {record.opponent_name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {record.total_matches === 0
                                ? "Never played"
                                : `${record.total_matches} matches`}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-blue-600">
                              {record.wins}
                            </div>
                            <div className="text-xs text-gray-500">
                              {selectedPlayer.name} Wins
                            </div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-red-600">
                              {record.losses}
                            </div>
                            <div className="text-xs text-gray-500">
                              {selectedPlayer.name} Losses
                            </div>
                          </div>
                          <div>
                            {record.total_matches === 0 ? (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-gray-200 text-gray-600"
                              >
                                No matches
                              </Badge>
                            ) : (
                              <Badge
                                className={`text-xs ${getWinRateColor(
                                  record.win_rate
                                )} text-white`}
                              >
                                {record.win_rate}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Overall Statistics View */}
        {currentView === "overall" && (
          <>
            {players.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    No statistics yet
                  </h3>
                  <p className="text-gray-500">
                    Play some tournaments to see player statistics
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Top Performers Summary */}
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <Card>
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center">
                        <Trophy className="h-8 w-8 text-yellow-500 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">Most Points</p>
                          <p className="text-lg md:text-xl font-bold">
                            {players[0]?.name || "N/A"}
                          </p>
                          <p className="text-sm text-yellow-600 font-medium">
                            {players[0]?.total_points || 0} points
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center">
                        <Target className="h-8 w-8 text-green-500 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">Best Win Rate</p>
                          {(() => {
                            const bestPlayer = players
                              .filter((p) => p.total_matches_played >= 3)
                              .sort(
                                (a, b) =>
                                  getWinRate(
                                    b.total_wins,
                                    b.total_matches_played
                                  ) -
                                  getWinRate(
                                    a.total_wins,
                                    a.total_matches_played
                                  )
                              )[0];
                            return (
                              <>
                                <p className="text-lg md:text-xl font-bold">
                                  {bestPlayer?.name || "N/A"}
                                </p>
                                <p className="text-sm text-green-600 font-medium">
                                  {bestPlayer
                                    ? getWinRate(
                                        bestPlayer.total_wins,
                                        bestPlayer.total_matches_played
                                      )
                                    : 0}
                                  % win rate
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-blue-500 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">Most Active</p>
                          {(() => {
                            const mostActive = players.sort(
                              (a, b) =>
                                b.total_matches_played - a.total_matches_played
                            )[0];
                            return (
                              <>
                                <p className="text-lg md:text-xl font-bold">
                                  {mostActive?.name || "N/A"}
                                </p>
                                <p className="text-sm text-blue-600 font-medium">
                                  {mostActive?.total_matches_played || 0}{" "}
                                  matches
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Player Statistics Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      All Player Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Desktop view */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-bold">
                              <SortButton field="rank">Rank</SortButton>
                            </th>
                            <th className="text-left p-3 font-bold">Player</th>
                            <th className="text-center p-3 font-bold">
                              <SortButton field="points">Points</SortButton>
                            </th>
                            <th className="text-center p-3 font-bold">
                              <SortButton field="matches">Matches</SortButton>
                            </th>
                            <th className="text-center p-3 font-bold">
                              <SortButton field="wins">Wins</SortButton>
                            </th>
                            <th className="text-center p-3 font-bold">
                              Losses
                            </th>
                            <th className="text-center p-3 font-bold">
                              <SortButton field="winRate">Win Rate</SortButton>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {getSortedPlayers().map((player, index) => {
                            const winRate = getWinRate(
                              player.total_wins,
                              player.total_matches_played
                            );
                            const originalIndex = players.findIndex(
                              (p) => p.id === player.id
                            );
                            return (
                              <tr
                                key={player.id}
                                className={`border-b hover:bg-gray-50 ${
                                  (sortField === "points" ||
                                    sortField === "matches" ||
                                    sortField === "wins" ||
                                    sortField === "winRate") &&
                                  sortDirection === "desc" &&
                                  index < 3
                                    ? "bg-gradient-to-r from-yellow-50 to-white border-gray-200 text-blue-700"
                                    : (sortField === "points" ||
                                        sortField === "matches" ||
                                        sortField === "wins" ||
                                        sortField === "winRate") &&
                                      sortDirection === "desc" &&
                                      index >= getSortedPlayers().length - 3
                                    ? "bg-gradient-to-r from-red-50 to-white border-gray-200 text-red-700"
                                    : ""
                                }`}
                              >
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className={
                                        (sortField === "points" ||
                                          sortField === "matches" ||
                                          sortField === "wins" ||
                                          sortField === "winRate") &&
                                        sortDirection === "desc" &&
                                        index < 3
                                          ? "bg-blue-100 border-blue-300 text-blue-700"
                                          : (sortField === "points" ||
                                              sortField === "matches" ||
                                              sortField === "wins" ||
                                              sortField === "winRate") &&
                                            sortDirection === "desc" &&
                                            index >=
                                              getSortedPlayers().length - 3
                                          ? "bg-red-100 border-red-300 text-red-700"
                                          : ""
                                      }
                                    >
                                      #{index + 1}
                                    </Badge>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage
                                        src={getPlayerImageSrc(player)}
                                        alt={player.name}
                                      />
                                      <AvatarFallback>
                                        <User className="h-4 w-4" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">
                                      {player.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="text-center p-3">
                                  <span className="text-lg font-bold text-green-600">
                                    {player.total_points}
                                  </span>
                                </td>
                                <td className="text-center p-3">
                                  {player.total_matches_played}
                                </td>
                                <td className="text-center p-3 text-blue-600 font-medium">
                                  {player.total_wins}
                                </td>
                                <td className="text-center p-3 text-red-600 font-medium">
                                  {player.total_losses}
                                </td>
                                <td className="text-center p-3">
                                  <Badge
                                    className={`${getWinRateColor(
                                      winRate
                                    )} text-white`}
                                  >
                                    {winRate}%
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile view */}
                    <div className="md:hidden">
                      {/* Mobile Sort Controls */}
                      <div className="mb-4 flex flex-wrap gap-2">
                        <span className="text-sm text-gray-600 mr-2">
                          Sort by:
                        </span>
                        <button
                          onClick={() => handleSort("rank")}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                            sortField === "rank"
                              ? "bg-blue-100 border-blue-300 text-blue-700"
                              : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          Rank{" "}
                          {sortField === "rank" &&
                            (sortDirection === "asc" ? "↑" : "↓")}
                        </button>
                        <button
                          onClick={() => handleSort("points")}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                            sortField === "points"
                              ? "bg-blue-100 border-blue-300 text-blue-700"
                              : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          Points{" "}
                          {sortField === "points" &&
                            (sortDirection === "asc" ? "↑" : "↓")}
                        </button>
                        <button
                          onClick={() => handleSort("matches")}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                            sortField === "matches"
                              ? "bg-blue-100 border-blue-300 text-blue-700"
                              : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          Matches{" "}
                          {sortField === "matches" &&
                            (sortDirection === "asc" ? "↑" : "↓")}
                        </button>
                        <button
                          onClick={() => handleSort("wins")}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                            sortField === "wins"
                              ? "bg-blue-100 border-blue-300 text-blue-700"
                              : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          Wins{" "}
                          {sortField === "wins" &&
                            (sortDirection === "asc" ? "↑" : "↓")}
                        </button>
                        <button
                          onClick={() => handleSort("winRate")}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                            sortField === "winRate"
                              ? "bg-blue-100 border-blue-300 text-blue-700"
                              : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          Win Rate{" "}
                          {sortField === "winRate" &&
                            (sortDirection === "asc" ? "↑" : "↓")}
                        </button>
                      </div>

                      <div className="space-y-4">
                        {getSortedPlayers().map((player, index) => {
                          const winRate = getWinRate(
                            player.total_wins,
                            player.total_matches_played
                          );
                          return (
                            <div
                              key={player.id}
                              className={`p-4 rounded-lg border ${
                                sortField === "points" &&
                                sortDirection === "desc" &&
                                index < 3
                                  ? "bg-gradient-to-r from-yellow-50 to-transparent border-yellow-200"
                                  : "bg-white border-gray-200"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  {sortField === "points" &&
                                    sortDirection === "desc" &&
                                    index === 0 && (
                                      <Trophy className="h-4 w-4 text-yellow-500" />
                                    )}
                                  <Badge
                                    variant={
                                      sortField === "points" &&
                                      sortDirection === "desc" &&
                                      index < 3
                                        ? "default"
                                        : "outline"
                                    }
                                  >
                                    #{index + 1}
                                  </Badge>
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage
                                      src={getPlayerImageSrc(player)}
                                      alt={player.name}
                                    />
                                    <AvatarFallback>
                                      <User className="h-4 w-4" />
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                                <span className="font-medium text-lg">
                                  {player.name}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="text-center">
                                  <div className="text-gray-500 text-xs">
                                    Total Points
                                  </div>
                                  <div className="text-xl font-bold text-green-600">
                                    {player.total_points}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-gray-500 text-xs">
                                    Win Rate
                                  </div>
                                  <Badge
                                    className={`text-xs ${getWinRateColor(
                                      winRate
                                    )} text-white`}
                                  >
                                    {winRate}%
                                  </Badge>
                                </div>
                                <div className="text-center">
                                  <div className="text-gray-500 text-xs">
                                    Matches
                                  </div>
                                  <div className="font-medium">
                                    {player.total_matches_played}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-gray-500 text-xs">
                                    W / L
                                  </div>
                                  <div className="font-medium">
                                    <span className="text-blue-600">
                                      {player.total_wins}
                                    </span>
                                    <span className="text-gray-400 mx-1">
                                      /
                                    </span>
                                    <span className="text-red-600">
                                      {player.total_losses}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
