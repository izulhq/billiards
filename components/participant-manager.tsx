"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  ArrowLeft,
  Home,
  Plane,
  Table,
  User,
  UserPlus,
  Settings,
} from "lucide-react";
import type { Player, TournamentType, PlayerProfile } from "@/app/page";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import ProfileImageUpload from "@/components/profile-image-upload";

interface ParticipantManagerProps {
  tournamentType: TournamentType;
  onTournamentCreated: (tournament: any) => void;
  onBack: () => void;
}

export default function ParticipantManager({
  tournamentType,
  onTournamentCreated,
  onBack,
}: ParticipantManagerProps) {
  const [playerName, setPlayerName] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [players, setPlayers] = useState<Omit<Player, "tournament_id">[]>([]);
  const [existingPlayers, setExistingPlayers] = useState<PlayerProfile[]>([]);
  const [tournamentName, setTournamentName] = useState("");
  const [homeAwayEnabled, setHomeAwayEnabled] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const { toast } = useToast();

  // Load existing players from database
  useEffect(() => {
    loadExistingPlayers();
  }, []);

  const loadExistingPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("player_profiles")
        .select("*")
        .order("name");

      if (error) throw error;
      setExistingPlayers(data || []);
    } catch (error) {
      console.error("Error loading existing players:", error);
    }
  };

  const addPlayer = () => {
    let playerToAdd: { name: string; profile?: PlayerProfile | null } | null =
      null;

    if (selectedPlayerId) {
      // Adding from dropdown
      const existingPlayer = existingPlayers.find(
        (p) => p.id === selectedPlayerId
      );
      if (
        existingPlayer &&
        !players.find(
          (p) => p.name.toLowerCase() === existingPlayer.name.toLowerCase()
        )
      ) {
        playerToAdd = {
          name: existingPlayer.name,
          profile: existingPlayer,
        };
      }
    } else if (playerName.trim()) {
      // Adding manually
      if (
        !players.find((p) => p.name.toLowerCase() === playerName.toLowerCase())
      ) {
        playerToAdd = {
          name: playerName.trim(),
          profile: null,
        };
      }
    }

    if (playerToAdd) {
      const newPlayer: Omit<Player, "tournament_id"> = {
        id: Date.now().toString(),
        name: playerToAdd.name,
        points: 0,
        played: 0,
        won: 0,
        lost: 0,
        profile_id: playerToAdd.profile?.id || null,
        profile: playerToAdd.profile,
      };
      setPlayers([...players, newPlayer]);
      setPlayerName("");
      setSelectedPlayerId("");
    }
  };

  const updatePlayerImage = (playerId: string, imagePath: string) => {
    setPlayers(
      players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              profile: {
                id: playerId,
                name: player.name,
                profile_image: imagePath,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                total_matches_played: 0,
                total_wins: 0,
                total_losses: 0,
                total_points: 0,
              },
            }
          : player
      )
    );
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addPlayer();
    }
  };

  const canStartTournament = () => {
    if (tournamentType === "league") {
      return players.length >= 3;
    }
    // For cup tournament, need power of 2 participants
    return players.length >= 2 && (players.length & (players.length - 1)) === 0;
  };

  const getMinPlayersMessage = () => {
    if (tournamentType === "league") {
      return "Minimum 3 players required for league tournament";
    }
    return "Cup tournament requires 2, 4, 8, 16, etc. players";
  };

  const calculateTotalMatches = () => {
    const n = players.length;
    const basePairs = (n * (n - 1)) / 2; // Each pair plays once
    return homeAwayEnabled ? basePairs * 2 : basePairs; // Double if home/away
  };

  const createTournament = async () => {
    if (!tournamentName.trim() || players.length === 0) return;

    setIsCreating(true);

    try {
      // 1️⃣ Create tournament
      let { data: tournament, error } = await supabase
        .from("tournaments")
        .insert({
          name: tournamentName.trim(),
          type: tournamentType,
          status: "active",
          home_away_enabled: homeAwayEnabled,
        })
        .select()
        .single();

      // 2️⃣ If the column doesn't exist, retry WITHOUT it
      if (error && /home_away_enabled/.test(error.message)) {
        ({ data: tournament, error } = await supabase
          .from("tournaments")
          .insert({
            name: tournamentName.trim(),
            type: tournamentType,
            status: "active",
          })
          .select()
          .single());
      }

      if (error) throw error;
      if (!tournament) throw new Error("Tournament creation failed");

      // 3️⃣ Create or get player profiles and tournament players
      const playersToInsert = [];

      for (const player of players) {
        let profileId = null;

        // Always create or get player profile (with or without image)
        const { data: profileData, error: profileError } = await supabase.rpc(
          "get_or_create_player_profile",
          {
            player_name: player.name,
            image_path: player.profile?.profile_image || null,
          }
        );

        if (profileError) {
          console.error("Error creating profile:", profileError);
          // If RPC fails, try to find existing profile or create manually
          const { data: existingProfile } = await supabase
            .from("player_profiles")
            .select("id")
            .eq("name", player.name)
            .single();

          if (existingProfile) {
            profileId = existingProfile.id;
          } else {
            // Create profile manually if RPC failed
            const { data: newProfile, error: insertError } = await supabase
              .from("player_profiles")
              .insert({
                name: player.name,
                profile_image: player.profile?.profile_image || null,
              })
              .select("id")
              .single();

            if (!insertError && newProfile) {
              profileId = newProfile.id;
            }
          }
        } else {
          profileId = profileData;
        }

        playersToInsert.push({
          tournament_id: tournament.id,
          name: player.name,
          points: 0,
          played: 0,
          won: 0,
          lost: 0,
          profile_id: profileId,
        });
      }

      const { error: playersError } = await supabase
        .from("players")
        .insert(playersToInsert);
      if (playersError) throw playersError;

      // make sure the flag is always present in local state
      const tournamentWithFlag = {
        ...tournament,
        home_away_enabled: homeAwayEnabled,
      };

      onTournamentCreated(tournamentWithFlag);
    } catch (err) {
      console.error("Error creating tournament:", err);
      toast({
        title: "Could not create tournament",
        description: (err as { message?: string })?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-4 justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 capitalize sm:text-3xl">
              {tournamentType} Tournament
            </h1>
            <p className="text-gray-600 text-xs sm:text-md">
              Add participants to your tournament
            </p>
          </div>{" "}
          <Button
            variant="ghost"
            onClick={onBack}
            className="bg-blue-500 hover:bg-blue-600 text-white hover:text-white text-xs sm:text-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Tournament Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tournamentName">Tournament Name</Label>
                <Input
                  id="tournamentName"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  placeholder="Enter tournament name"
                  className="mt-1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="homeAway"
                  checked={homeAwayEnabled}
                  onCheckedChange={(checked) =>
                    setHomeAwayEnabled(checked as boolean)
                  }
                  className="border-blue-500 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white"
                />
                <Label htmlFor="homeAway" className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-blue-600" />
                  <Plane className="h-4 w-4 text-green-600" />
                  Enable Home/Away (Breaking) - Each pair plays twice
                </Label>
              </div>

              {players.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Total matches:</strong> {calculateTotalMatches()}{" "}
                    matches
                    {homeAwayEnabled && (
                      <span className="block text-xs mt-1">
                        Each player plays {players.length - 1} opponents × 2 ={" "}
                        {(players.length - 1) * 2} matches
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Add Player</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      {showManualInput
                        ? "Create a new player profile"
                        : `Choose from ${existingPlayers.length} existing players`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowManualInput(!showManualInput)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {showManualInput ? "Choose from List" : "Add New Player"}
                  </Button>
                </div>

                {showManualInput ? (
                  // Manual input mode
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label htmlFor="playerName">New Player Name</Label>
                      <Input
                        id="playerName"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter new player name"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={addPlayer} disabled={!playerName.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Dropdown mode
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label htmlFor="playerSelect">
                        Select Existing Player
                      </Label>
                      {existingPlayers.filter(
                        (p) =>
                          !players.find(
                            (player) =>
                              player.name.toLowerCase() === p.name.toLowerCase()
                          )
                      ).length === 0 ? (
                        <div className="mt-1 p-3 border rounded-md bg-gray-50 text-gray-500 text-sm">
                          No available players. All existing players have been
                          added or use "Add New Player" to create one.
                        </div>
                      ) : (
                        <Select
                          value={selectedPlayerId}
                          onValueChange={setSelectedPlayerId}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Choose a player..." />
                          </SelectTrigger>
                          <SelectContent>
                            {existingPlayers
                              .filter(
                                (p) =>
                                  !players.find(
                                    (player) =>
                                      player.name.toLowerCase() ===
                                      p.name.toLowerCase()
                                  )
                              )
                              .map((player) => (
                                <SelectItem key={player.id} value={player.id}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage
                                        src={
                                          player.profile_image
                                            ? player.profile_image.startsWith(
                                                "/"
                                              )
                                              ? player.profile_image
                                              : `/${player.profile_image}`
                                            : "/placeholder-user.jpg"
                                        }
                                        alt={player.name}
                                      />
                                      <AvatarFallback>
                                        <User className="h-3 w-3" />
                                      </AvatarFallback>
                                    </Avatar>
                                    {player.name}
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={addPlayer}
                        disabled={
                          !selectedPlayerId ||
                          existingPlayers.filter(
                            (p) =>
                              !players.find(
                                (player) =>
                                  player.name.toLowerCase() ===
                                  p.name.toLowerCase()
                              )
                          ).length === 0
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Table className="h-5 w-5 mr-2" />
                Participants ({players.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {players.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No participants added yet
                </p>
              ) : (
                <div className="space-y-4">
                  {players.map((player, index) => (
                    <div key={player.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={
                                player.profile?.profile_image
                                  ? player.profile.profile_image.startsWith("/")
                                    ? player.profile.profile_image
                                    : `/${player.profile.profile_image}`
                                  : "/placeholder-user.jpg"
                              }
                              alt={player.name}
                            />
                            <AvatarFallback>
                              <User className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{player.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setEditingPlayer(
                                editingPlayer === player.id ? null : player.id
                              )
                            }
                          >
                            {editingPlayer === player.id
                              ? "Cancel"
                              : "Edit Photo"}
                          </Button> */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePlayer(player.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {editingPlayer === player.id && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <ProfileImageUpload
                            currentImage={player.profile?.profile_image}
                            playerName={player.name}
                            onImageChange={(imagePath) =>
                              updatePlayerImage(player.id, imagePath)
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center">
            {!canStartTournament() && (
              <p className="text-sm text-gray-600 mb-4">
                {getMinPlayersMessage()}
              </p>
            )}
            <Button
              onClick={createTournament}
              disabled={
                !canStartTournament() || !tournamentName.trim() || isCreating
              }
              size="lg"
              className="px-8"
            >
              {isCreating ? "Creating Tournament..." : "Create Tournament"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
