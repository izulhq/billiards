"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, Plane, Trophy, Crown, User } from "lucide-react";
import type { Match, Player } from "@/app/page";

interface MatchCardProps {
  match: Match;
  players: Player[];
  onUpdateResult: (matchId: number, winnerId: string) => void;
}

export default function MatchCard({
  match,
  players,
  onUpdateResult,
}: MatchCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getPlayerById = (id: string) => {
    return players.find((p) => p.id === id);
  };

  const getPlayerImageSrc = (player: Player) => {
    console.log(`Getting image for player: ${player.name}`, {
      profile: player.profile,
      profileImage: player.profile?.profile_image,
    });

    if (player.profile?.profile_image) {
      let imageSrc = "";

      // If it starts with /players/, it's a local image
      if (player.profile.profile_image.startsWith("/players/")) {
        imageSrc = player.profile.profile_image;
      }
      // If it's a full URL, use it directly
      else if (player.profile.profile_image.startsWith("http")) {
        imageSrc = player.profile.profile_image;
      }
      // Otherwise, treat it as a public folder image
      else {
        imageSrc = `/${player.profile.profile_image}`;
      }

      console.log(`Final image src for ${player.name}: ${imageSrc}`);
      return imageSrc;
    }

    console.log(`No profile image for ${player.name}, using placeholder`);
    return "/placeholder-user.jpg";
  };

  const homePlayer = getPlayerById(match.home_player_id);
  const awayPlayer = getPlayerById(match.away_player_id);

  if (!homePlayer || !awayPlayer) {
    return <div>Error: Players not found</div>;
  }

  const handleWinnerSelect = async (winnerId: string) => {
    setIsSubmitting(true);
    await onUpdateResult(match.id, winnerId);
    setIsSubmitting(false);
  };

  if (match.completed) {
    const winner = match.winner_id === homePlayer.id ? homePlayer : awayPlayer;
    const loser = match.winner_id === homePlayer.id ? awayPlayer : homePlayer;

    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <Badge variant="secondary" className="self-start">
                Match #{match.match_number || match.id}
              </Badge>

              {/* Mobile: Stack players vertically */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                {/* Home Player */}
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={getPlayerImageSrc(homePlayer)}
                      alt={homePlayer.name}
                    />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <Home className="h-4 w-4 text-blue-600" />
                  <span
                    className={`font-medium text-sm sm:text-base ${
                      match.winner_id === homePlayer.id
                        ? "text-green-600 font-bold"
                        : "text-gray-500"
                    }`}
                  >
                    {homePlayer.name}
                  </span>
                  {match.winner_id === homePlayer.id && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                </div>

                <span className="text-gray-400 text-center hidden sm:inline">
                  vs
                </span>

                {/* Away Player */}
                <div className="flex items-center gap-2">
                  {match.winner_id === awayPlayer.id && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                  <span
                    className={`font-medium text-sm sm:text-base ${
                      match.winner_id === awayPlayer.id
                        ? "text-green-600 font-bold"
                        : "text-gray-500"
                    }`}
                  >
                    {awayPlayer.name}
                  </span>
                  <Plane className="h-4 w-4 text-green-600" />
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={getPlayerImageSrc(awayPlayer)}
                      alt={awayPlayer.name}
                    />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-600" />
              <Badge variant="default" className="text-xs sm:text-sm">
                {winner.name} Wins!
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <Badge variant="outline">
            Match #{match.match_number || match.id}
          </Badge>
          <span className="text-sm text-gray-500">Who wins?</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-2 gap-6 mb-4">
          {/* Home Player */}
          <div className="flex flex-col items-center text-center gap-2">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={getPlayerImageSrc(homePlayer)}
                alt={homePlayer.name}
              />
              <AvatarFallback>
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{homePlayer.name}</p>
              <p className="text-sm text-blue-600 flex items-center gap-1 justify-center">
                <Home className="h-4 w-4" />
                Home
              </p>
            </div>
          </div>

          {/* Away Player */}
          <div className="flex flex-col items-center text-center gap-2">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={getPlayerImageSrc(awayPlayer)}
                alt={awayPlayer.name}
              />
              <AvatarFallback>
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{awayPlayer.name}</p>
              <p className="text-sm text-green-600 flex items-center gap-1 justify-center">
                <Plane className="h-4 w-4" />
                Away
              </p>
            </div>
          </div>
        </div>

        {/* VS
        <div className="text-center mb-4">
          <span className="text-2xl font-bold text-black">VS</span>
        </div> */}

        {/* Win Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => handleWinnerSelect(homePlayer.id)}
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {isSubmitting ? "Recording..." : `${homePlayer.name} Wins`}
          </Button>

          <Button
            onClick={() => handleWinnerSelect(awayPlayer.id)}
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {isSubmitting ? "Recording..." : `${awayPlayer.name} Wins`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
