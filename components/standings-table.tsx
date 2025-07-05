"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, List } from "lucide-react";
import type { Player } from "@/app/page";

interface StandingsTableProps {
  players: Player[];
}

export default function StandingsTable({ players }: StandingsTableProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    // Sort by points first, then by games won, then by games played (fewer is better if points are equal)
    if (b.points !== a.points) return b.points - a.points;
    if (b.won !== a.won) return b.won - a.won;
    return a.played - b.played;
  });

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getPositionBadge = (position: number) => {
    switch (position) {
      case 1:
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">1st</Badge>;
      case 2:
        return <Badge className="bg-gray-400 hover:bg-gray-500">2nd</Badge>;
      case 3:
        return <Badge className="bg-amber-600 hover:bg-amber-700">3rd</Badge>;
      default:
        return <Badge variant="outline">{position}th</Badge>;
    }
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
                      position <= 3
                        ? "bg-gradient-to-r from-yellow-50 to-transparent"
                        : ""
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getPositionIcon(position)}
                        {getPositionBadge(position)}
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
                        className={`
                        ${
                          Number.parseFloat(winRate) < 33
                            ? "bg-red-500 hover:bg-red-600 shadow-md"
                            : ""
                        }
                        ${
                          Number.parseFloat(winRate) >= 34 &&
                          Number.parseFloat(winRate) < 66
                            ? "bg-green-400 hover:bg-green-500 shadow-md"
                            : ""
                        }
                        ${
                          Number.parseFloat(winRate) > 66
                            ? "bg-blue-400 hover:bg-blue-500 shadow-md"
                            : ""
                        }
                      `}
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
                  position <= 3
                    ? "bg-gradient-to-r from-yellow-50 to-transparent border-yellow-200"
                    : "bg-white border-gray-200"
                }`}
              >
                {/* Top row: Position and Player */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getPositionIcon(position)}
                    {getPositionBadge(position)}
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
                      className={`text-xs ${
                        Number.parseFloat(winRate) < 33
                          ? "bg-red-500 hover:bg-red-600"
                          : Number.parseFloat(winRate) >= 34 &&
                            Number.parseFloat(winRate) < 66
                          ? "bg-green-400 hover:bg-green-500"
                          : "bg-blue-400 hover:bg-blue-500"
                      }`}
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
