import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert
} from "react-native";

import { db, auth } from "../../firebase/config";
import { addDoc, collection } from "firebase/firestore";

export default function PRLReportDetails({ route }) {

  const { report } = route.params;
  const [feedback, setFeedback] = useState("");

  const submitFeedback = async () => {
    if (!feedback) {
      Alert.alert("Error", "Enter feedback");
      return;
    }

    try {
      await addDoc(collection(db, "feedback"), {
        reportId: report.id,
        feedback,
        prlId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });

      Alert.alert("Success", "Feedback added");
      setFeedback("");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Report Details</Text>

      <Text>Course: {report.courseName}</Text>
      <Text>Lecturer: {report.lecturerName}</Text>
      <Text>Date: {report.date}</Text>
      <Text>Topic: {report.topic}</Text>

      <TextInput
        placeholder="Write feedback..."
        value={feedback}
        onChangeText={setFeedback}
        style={styles.input}
        multiline
      />

      <Button title="Submit Feedback" onPress={submitFeedback} />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    marginVertical: 15,
    padding: 10,
    borderRadius: 8,
    height: 80
  }
});