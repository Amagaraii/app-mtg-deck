import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
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
        throw new Error('Erreur API');
      }

      const data = await response.json();

      setCard({
        name: data.name,
        type_line: data.type_line,
        image_uris: data.image_uris,
      });
    } catch {
      setError('Impossible de tirer un commandant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>✨ Random Commander ✨</Text>
        <Text style={styles.subtitle}>
          Découvre un commandant au hasard
        </Text>

        <Pressable style={styles.button} onPress={getRandomCommander}>
          <Text style={styles.buttonText}>Tirer un commandant</Text>
        </Pressable>

        {loading && (
          <ActivityIndicator size="large" color="#6b5cff" style={{ marginTop: 30 }} />
        )}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f6f4ff',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#3d348b',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#6d6875',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#5f5cff',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    marginTop: 30,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5,
  },
  cardName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2b2d42',
    textAlign: 'center',
  },
  cardType: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 10,
    textAlign: 'center',
  },
  image: {
    width: 240,
    height: 340,
    resizeMode: 'contain',
    borderRadius: 12,
  },
  error: {
    color: '#e63946',
    marginTop: 20,
  },
});
