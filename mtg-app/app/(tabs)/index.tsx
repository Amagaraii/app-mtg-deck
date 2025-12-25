import { useState } from 'react';
import {
  View,
  Text,
  Button,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

type CommanderCard = {
  name: string;
  type_line: string;
  image_uris?: {
    normal: string;
  };
};

export default function HomeScreen() {
  const [card, setCard] = useState<CommanderCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRandomCommander = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        'https://api.scryfall.com/cards/random?q=is:commander'
      );

      if (!response.ok) {
        throw new Error('Erreur API Scryfall');
      }

      const data = await response.json();

      setCard({
        name: data.name,
        type_line: data.type_line,
        image_uris: data.image_uris,
      });
    } catch (err) {
      setError('Impossible de récupérer un commandant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Random Commander</Text>

      <Button title="Tirer un commandant" onPress={getRandomCommander} />

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

      {error && <Text style={styles.error}>{error}</Text>}

      {card && (
        <View style={styles.card}>
          <Text style={styles.cardName}>{card.name}</Text>
          <Text style={styles.cardType}>{card.type_line}</Text>

          {card.image_uris?.normal && (
            <Image
              source={{ uri: card.image_uris.normal }}
              style={styles.image}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  card: {
    marginTop: 20,
    alignItems: 'center',
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardType: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  image: {
    width: 250,
    height: 350,
    resizeMode: 'contain',
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
});
