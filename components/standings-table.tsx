"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, List } from "lucide-react";
import type { Player } from "@/app/page";

interface StandingsTableProps {
  players: Player[];
}

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

export default function StandingsTable({ players }: StandingsTableProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    // Sort by points first, then by games won, then by games played (fewer is better if points are equal)
    if (b.points !== a.points) return b.points - a.points;
    if (b.won !== a.won) return b.won - a.won;
    return a.played - b.played;
  });

  const getPositionIcon = (position: number) => {
    if (position === 1) {
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <List className="h-5 w-5 mr-2 text-blue-600" />
          Tournament Standings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-bold">Position</th>
                <th className="text-left p-3 font-bold">Player</th>
                <th className="text-center p-3 font-bold">Points</th>
                <th className="text-center p-3 font-bold">Played</th>
                <th className="text-center p-3 font-bold">Won</th>
                <th className="text-center p-3 font-bold">Lost</th>
                <th className="text-center p-3 font-bold">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player, index) => {
                const position = index + 1;
                const winRate =
                  player.played > 0
                    ? ((player.won / player.played) * 100).toFixed(1)
                    : "0.0";

                return (
                  <tr
                    key={player.id}
                    className={`border-b hover:bg-gray-50 ${
                      position === 1
                        ? "bg-gradient-to-r from-yellow-50 to-white border-gray-200 text-blue-700"
                        : position === sortedPlayers.length &&
                          sortedPlayers.length > 1
                        ? "bg-gradient-to-r from-red-50 to-white border-gray-200 text-red-700"
                        : ""
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {position === 1 ? getPositionIcon(position) : null}
                        <Badge
                          variant="outline"
                          className={
                            position === 1
                              ? "bg-blue-100 border-blue-300 text-blue-700"
                              : position === sortedPlayers.length &&
                                sortedPlayers.length > 1
                              ? "bg-red-100 border-red-300 text-red-700"
                              : ""
                          }
                        >
                          #{position}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`font-medium ${
                          position === 1 ? "text-yellow-700" : ""
                        }`}
                      >
                        {player.name}
                      </span>
                    </td>
                    <td className="text-center p-3">
                      <span className="text-lg font-bold text-green-600">
                        {player.points}
                      </span>
                    </td>
                    <td className="text-center p-3">{player.played}</td>
                    <td className="text-center p-3 text-blue-600 font-medium">
                      {player.won}
                    </td>
                    <td className="text-center p-3 text-red-600 font-medium">
                      {player.lost}
                    </td>
                    <td className="text-center p-3">
                      <Badge
                        className={`${getWinRateColor(
                          Number.parseFloat(winRate)
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

        {/* Mobile layout */}
        <div className="md:hidden space-y-3">
          {sortedPlayers.map((player, index) => {
            const position = index + 1;
            const winRate =
              player.played > 0
                ? ((player.won / player.played) * 100).toFixed(1)
                : "0.0";

            return (
              <div
                key={player.id}
                className={`p-4 rounded-lg border ${
                  position === 1
                    ? "bg-gradient-to-r from-yellow-50 to-transparent border-yellow-200"
                    : position === sortedPlayers.length &&
                      sortedPlayers.length > 1
                    ? "bg-gradient-to-r from-red-50 to-white border-red-300"
                    : "bg-white border-gray-200"
                }`}
              >
                {/* Top row: Position and Player */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {position === 1 ? getPositionIcon(position) : null}
                    <Badge
                      variant={
                        position === 1
                          ? "default"
                          : position === sortedPlayers.length &&
                            sortedPlayers.length > 1
                          ? "destructive"
                          : "outline"
                      }
                      className={
                        position === sortedPlayers.length &&
                        sortedPlayers.length > 1
                          ? "bg-red-100 border-red-300 text-red-700"
                          : ""
                      }
                    >
                      #{position}
                    </Badge>
                  </div>
                  <span
                    className={`font-medium text-lg ${
                      position === 1 ? "text-yellow-700" : ""
                    }`}
                  >
                    {player.name}
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-center">
                    <div className="text-gray-500 text-xs">Points</div>
                    <div className="text-xl font-bold text-green-600">
                      {player.points}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500 text-xs">Win Rate</div>
                    <Badge
                      className={`text-xs ${getWinRateColor(
                        Number.parseFloat(winRate)
                      )} text-white`}
                    >
                      {winRate}%
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500 text-xs">Played</div>
                    <div className="font-medium">{player.played}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500 text-xs">Record</div>
                    <div className="font-medium">
                      <span className="text-blue-600">{player.won}</span>
                      <span className="text-gray-400 mx-1">-</span>
                      <span className="text-red-600">{player.lost}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {sortedPlayers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No players added yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
