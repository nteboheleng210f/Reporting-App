import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, setDoc } from "firebase/firestore";

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);

  const register = async () => {
    if (!username || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);

    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await setDoc(doc(db, "users", userCred.user.uid), {
        username: username.trim(),
        email: email.trim(),
        role,
        createdAt: new Date().toISOString(),
      });

      alert("Account created successfully!");
      navigation.replace("Login");
    } catch (error) {
      switch (error.code) {
        case "auth/email-already-in-use":
          alert("This email is already registered.");
          break;
        case "auth/invalid-email":
          alert("Invalid email format.");
          break;
        case "auth/weak-password":
          alert("Password must be at least 6 characters.");
          break;
        default:
          alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Sign Up</Text>
          <Text style={styles.subtitle}>Create your account</Text>

          <TextInput
            placeholder="Username"
            style={styles.input}
            onChangeText={setUsername}
          />

          <TextInput
            placeholder="Email"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={setEmail}
          />

          <TextInput
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>Role</Text>
          <View style={styles.roleContainer}>
            {["student", "lecturer", "prl", "pl"].map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleButton,
                  role === r && styles.activeRole,
                ]}
                onPress={() => setRole(r)}
              >
                <Text style={styles.roleText}>{r.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={register}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Please wait..." : "Register"}
            </Text>
          </TouchableOpacity>

          <Text
            style={styles.link}
            onPress={() => navigation.navigate("Login")}
          >
            Already have an account? Login
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eef2f7" },
  scroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  card: { width: "100%", backgroundColor: "#fff", padding: 25, borderRadius: 20, elevation: 8 },
  title: { fontSize: 26, fontWeight: "bold", textAlign: "center", color: "#273c75" },
  subtitle: { textAlign: "center", color: "#777", marginBottom: 20 },
  input: { backgroundColor: "#f5f6fa", padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: "#ddd" },
  label: { marginBottom: 10, fontWeight: "600", color: "#333" },
  roleContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  roleButton: { flex: 1, marginHorizontal: 3, padding: 10, borderRadius: 10, backgroundColor: "#dcdde1", alignItems: "center" },
  activeRole: { backgroundColor: "#273c75" },
  roleText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  button: { backgroundColor: "#273c75", padding: 15, borderRadius: 10, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#fff", fontWeight: "bold" },
  link: { marginTop: 15, textAlign: "center", color: "#40739e" },
});
