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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { PlayerProfile } from "@/app/page";

interface StatisticsProps {
  onBack: () => void;
}

export default function Statistics({ onBack }: StatisticsProps) {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getWinRate = (wins: number, totalMatches: number) => {
    if (totalMatches === 0) return 0;
    return Math.round((wins / totalMatches) * 100);
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 70) return "bg-green-500 hover:bg-green-600";
    if (winRate >= 50) return "bg-blue-500 hover:bg-blue-600";
    if (winRate >= 30) return "bg-yellow-500 hover:bg-yellow-600";
    return "bg-red-500 hover:bg-red-600";
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
        <div className="flex items-center mb-6 md:mb-8">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="h-6 w-6 md:h-8 md:w-8 mr-2 md:mr-3 text-blue-600" />
              Player Statistics
            </h1>
            <p className="text-gray-600">
              Overall performance across all tournaments
            </p>
          </div>
        </div>

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
                              getWinRate(b.total_wins, b.total_matches_played) -
                              getWinRate(a.total_wins, a.total_matches_played)
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
                              {mostActive?.total_matches_played || 0} matches
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
                        <th className="text-left p-3 font-bold">Rank</th>
                        <th className="text-left p-3 font-bold">Player</th>
                        <th className="text-center p-3 font-bold">Points</th>
                        <th className="text-center p-3 font-bold">Matches</th>
                        <th className="text-center p-3 font-bold">Wins</th>
                        <th className="text-center p-3 font-bold">Losses</th>
                        <th className="text-center p-3 font-bold">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((player, index) => {
                        const winRate = getWinRate(
                          player.total_wins,
                          player.total_matches_played
                        );
                        return (
                          <tr
                            key={player.id}
                            className={`border-b hover:bg-gray-50 ${
                              index < 3
                                ? "bg-gradient-to-r from-yellow-50 to-transparent"
                                : ""
                            }`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {index === 0 && (
                                  <Trophy className="h-4 w-4 text-yellow-500" />
                                )}
                                <Badge
                                  variant={index < 3 ? "default" : "outline"}
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
                <div className="md:hidden space-y-4">
                  {players.map((player, index) => {
                    const winRate = getWinRate(
                      player.total_wins,
                      player.total_matches_played
                    );
                    return (
                      <div
                        key={player.id}
                        className={`p-4 rounded-lg border ${
                          index < 3
                            ? "bg-gradient-to-r from-yellow-50 to-transparent border-yellow-200"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {index === 0 && (
                              <Trophy className="h-4 w-4 text-yellow-500" />
                            )}
                            <Badge variant={index < 3 ? "default" : "outline"}>
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
                            <div className="text-gray-500 text-xs">Matches</div>
                            <div className="font-medium">
                              {player.total_matches_played}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-500 text-xs">W / L</div>
                            <div className="font-medium">
                              <span className="text-blue-600">
                                {player.total_wins}
                              </span>
                              <span className="text-gray-400 mx-1">/</span>
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
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
