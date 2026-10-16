import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { DEFAULT_GRADIENT } from "@/src/constants/colors";
import { useAuth } from "@/src/context/AuthContext";
import {
  addToCollection,
  getCollection,
  removeFromCollection,
} from "@/src/services/collection";
import { searchCards } from "@/src/services/scryfall";
import { CommanderCard } from "@/src/types/commander";
import { openEdhrec } from "@/src/utils/edhrec";

const CARD_WIDTH = 150;

const imageOf = (c: CommanderCard) =>
  c.image_uris?.normal ?? c.card_faces?.[0]?.image_uris?.normal;

export default function CollectionScreen() {
  const { user, signOut } = useAuth();
  const [cards, setCards] = useState<CommanderCard[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommanderCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) getCollection(user.id).then(setCards);
    }, [user])
  );

  const ownedNames = cards.map((c) => c.name);

  const runSearch = async () => {
    if (!query.trim()) return;
    try {
      setSearching(true);
      setResults(await searchCards(query));
      setSearched(true);
    } catch (e) {
      console.error(e);
      setResults([]);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  const add = async (c: CommanderCard) => {
    if (!user) return;
    setCards(await addToCollection(user.id, c));
  };

  const remove = async (name: string) => {
    if (!user) return;
    setCards(await removeFromCollection(user.id, name));
  };

  return (
    <LinearGradient colors={DEFAULT_GRADIENT} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Ma collection</Text>
          <Text style={styles.subtitle}>
            {user?.email} · {cards.length} carte{cards.length > 1 ? "s" : ""}
          </Text>

          <Pressable onPress={signOut} style={styles.logout}>
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </Pressable>

          {/* Recherche */}
          <View style={styles.panel}>
            <Text style={styles.label}>Ajouter une carte</Text>
            <View style={styles.searchRow}>
              <TextInput
                placeholder="Nom du commandant (FR ou EN)"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={runSearch}
                returnKeyType="search"
                style={styles.input}
              />
              <Pressable
                onPress={runSearch}
                disabled={searching}
                style={styles.searchBtn}
              >
                {searching ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.searchBtnText}>Chercher</Text>
                )}
              </Pressable>
            </View>

            {searched && results.length === 0 && (
              <Text style={styles.noResult}>Aucun résultat.</Text>
            )}

            {results.length > 0 && (
              <View style={styles.grid}>
                {results.map((c) => {
                  const isOwned = ownedNames.includes(c.name);
                  return (
                    <View key={c.id} style={styles.item}>
                      <Pressable onPress={() => openEdhrec(c)}>
                        <Image
                          source={{ uri: imageOf(c) }}
                          style={styles.image}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => (isOwned ? remove(c.name) : add(c))}
                        style={[styles.addBtn, isOwned && styles.addBtnOwned]}
                      >
                        <Text
                          style={[
                            styles.addText,
                            isOwned && styles.addTextOwned,
                          ]}
                        >
                          {isOwned ? "✓ Ajoutée" : "＋ Ajouter"}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Collection */}
          <Text style={styles.sectionTitle}>Mes cartes</Text>

          {cards.length === 0 ? (
            <Text style={styles.empty}>
              Ta collection est vide. Cherche un commandant ci-dessus pour
              l&apos;ajouter.
            </Text>
          ) : (
            <View style={styles.grid}>
              {cards.map((c) => (
                <View key={c.name} style={styles.item}>
                  <Pressable onPress={() => openEdhrec(c)}>
                    <Image source={{ uri: imageOf(c) }} style={styles.image} />
                  </Pressable>
                  <Pressable
                    onPress={() => remove(c.name)}
                    style={styles.removeBtn}
                  >
                    <Text style={styles.removeText}>Retirer</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", padding: 20, paddingBottom: 50 },
  title: { fontSize: 30, fontWeight: "800", color: "#111", marginTop: 10 },
  subtitle: { fontSize: 14, color: "rgba(0,0,0,0.65)", marginTop: 4 },
  logout: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#111",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  logoutText: { fontSize: 13, fontWeight: "700", color: "#111" },

  panel: {
    width: "100%",
    maxWidth: 420,
    marginTop: 22,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  label: { fontSize: 16, fontWeight: "700", color: "#111" },
  searchRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchBtn: {
    backgroundColor: "#111",
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 92,
  },
  searchBtnText: { color: "#fff", fontWeight: "700" },
  noResult: { marginTop: 12, color: "rgba(0,0,0,0.65)" },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    marginTop: 28,
  },
  empty: {
    marginTop: 20,
    fontSize: 15,
    color: "rgba(0,0,0,0.7)",
    textAlign: "center",
    maxWidth: 320,
  },

  grid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 14,
  },
  item: { alignItems: "center" },
  image: {
    width: CARD_WIDTH,
    height: (CARD_WIDTH * 340) / 240,
    resizeMode: "contain",
    borderRadius: 10,
  },
  addBtn: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#111",
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  addBtnOwned: { backgroundColor: "#111" },
  addText: { fontSize: 12, fontWeight: "700", color: "#111" },
  addTextOwned: { color: "#fff" },
  removeBtn: { marginTop: 6, paddingVertical: 4, paddingHorizontal: 10 },
  removeText: { fontSize: 12, fontWeight: "600", color: "#7a0000" },
});