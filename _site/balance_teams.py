import csv

class Player:
    """Custom object to represent a player with multiple attributes."""
    def __init__(self, player_data):
        self.name = player_data[0]
        self.current_rank = player_data[1].lower()
        self.peak_rank = player_data[2].lower()

def load_teams(file_path):
    """Load CSV file and return as list of rows (each row is a list of values)."""
    with open(file_path, 'r', encoding='utf-8') as file:
        reader = csv.reader(file)
        #header = next(reader)  # Get header row
        rows = [row for row in reader]
        return rows

def assign_rank_values(player_list, rank_map):
    for player in player_list:
        player.current_value = rank_map[player.current_rank]
        player.peak_value = rank_map[player.peak_rank]


        if player.current_rank == "unranked" and player.peak_rank != "unranked":
            player.current_value = player.peak_value - 2

        player.player_value = (player.current_value + player.peak_value) / 2


def balance_teams(player_list, teams, total_values, total_players, max_players = 5):
    for player in player_list:
        sorted_teams = sorted(teams, key=lambda x: total_values[teams.index(x)])
        for team in sorted_teams:
            if len(team) < max_players:
                team.append(player)
                total_values[teams.index(team)] += player.player_value
                total_players[teams.index(team)] += 1
                break
    
    print(teams)
    print(total_values)
    print(total_players)

def write_teams_to_csv(teams, total_values, total_players, output_file='teams.csv'):
    """Write teams to a CSV file with team header rows showing summary stats."""
    with open(output_file, 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        
        # Write header row
        writer.writerow(['Team', 'Player Name', 'Current Rank', 'Peak Rank', 'Player Value', 'Team Total Value', 'Team Player Count'])
        
        # Write each team
        for team_index, team in enumerate(teams):
            team_num = team_index + 1
            
            # Write team header row with summary stats
            writer.writerow([
                f'Team {team_num}',
                '',  # Empty for Player Name
                '',  # Empty for Current Rank
                '',  # Empty for Peak Rank
                '',  # Empty for Player Value
                total_values[team_index],
                total_players[team_index]
            ])
            
            # Write player rows (Team column left empty for players)
            for player in team:
                writer.writerow([
                    '',  # Empty Team column for player rows
                    player.name,
                    player.current_rank,
                    player.peak_rank,
                    player.player_value,
                    '',  # Empty for Team Total Value
                    ''   # Empty for Team Player Count
                ])
            
            # Add a blank row between teams for readability
            if team_index < len(teams) - 1:
                writer.writerow([])
    
    print(f"\nTeams written to {output_file}")

    
# Example usage:
if __name__ == '__main__':
    # Load the CSV
    players = load_teams('players.csv')  # Replace with your file path

    for player in players:
        print(player)
    
    rank_map = {
        "unranked": -1,
        "iron 1": 0,
        "iron 2": 0,
        "iron 3": 0,
        "bronze 1": 0,
        "bronze 2": 0,
        "bronze 3": 0,
        "silver 1": 0.5,
        "silver 2": 0.5,
        "silver 3": 0.5,
        "gold 1": 1,
        "gold 2": 2,
        "gold 3": 3,
        "platinum 1": 4,
        "platinum 2": 5,
        "platinum 3": 6,
        "diamond 1": 7,
        "diamond 2": 8,
        "diamond 3": 9,
        "ascendant 1": 10,
        "ascendant 2": 11,
        "ascendant 3": 12,
        "immortal 1": 13,
        "immortal 2": 14,
        "immortal 3": 15,
        "radiant": 17,
    }
    player_list = []

    for player in players:
        player_list.append(Player(player))
    
    assign_rank_values(player_list, rank_map)

    for player in player_list:
        print(player.name, player.current_value, player.peak_value, player.player_value)

    max_players = 5
    teams = [ [], [], []]
    total_values = [0, 0, 0]
    total_players = [0, 0, 0]

    # Sort players by player_value in descending order
    player_list.sort(key=lambda x: x.player_value, reverse=True)

    balance_teams(player_list, teams, total_values, total_players, max_players)

    ind = 0
    for team in teams:
        print("Team", ind + 1)
        for player in team:
            print("    ", player.name, player.player_value)
        print("    Total Value: ", total_values[ind])
        print("    Total Players: ", total_players[ind])
        print("")
        ind += 1
    
    # Write teams to CSV file
    write_teams_to_csv(teams, total_values, total_players, 'teams.csv')
