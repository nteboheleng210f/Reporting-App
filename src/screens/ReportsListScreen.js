import React, { useEffect, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

export default function ReportsScreen() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const snapshot = await getDocs(collection(db, "reports"));

    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    setReports(data);
  };

  return (
    <View style={{ padding: 20 }}>
      <Text> Submitted Reports</Text>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginVertical: 10 }}>
            <Text>Course: {item.courseCode}</Text>
            <Text>Topic: {item.topic}</Text>
            <Text>Students: {item.studentsPresent}/{item.registeredStudents}</Text>
          </View>
        )}
      />
    </View>
  );
}