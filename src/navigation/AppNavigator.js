import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import Login from "../screens/Login";
import Register from "../screens/Register";

// STUDENT
import StudentDashboard from "../screens/StudentDashboard";

// LECTURER
import LecturerDashboard from "../screens/LectureDashboard";
import LectureReportForm from "../screens/LectureReportForm";

// SHARED SCREENS (ONE PER FEATURE)
import AttendanceScreen from "../screens/AttendanceScreen";
import RatingScreen from "../screens/RatingScreen";
import MonitoringScreen from "../screens/MonitoringScreen";
import ClassesScreen from "../screens/ClassesScreen";
import CoursesScreen from "../screens/CoursesScreen";


// PRL
import PRLDashboard from "../screens/prl/PRLDashboard";
import ReportsScreen from "../screens/prl/ReportsScreen";
import ReportDetails from "../screens/prl/ReportDetails";
import PLDashboard from "../screens/PL/PLDashboard";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">

      
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Register" component={Register} />

        <Stack.Screen name="StudentDashboard" component={StudentDashboard} />

      
        <Stack.Screen name="LecturerDashboard" component={LecturerDashboard} />
        <Stack.Screen name="LectureReportForm" component={LectureReportForm} />

       
        <Stack.Screen name="Attendance" component={AttendanceScreen} />
        <Stack.Screen name="Ratings" component={RatingScreen} />
        <Stack.Screen name="Monitoring" component={MonitoringScreen} />
        <Stack.Screen name="Classes" component={ClassesScreen} />
        <Stack.Screen name="PRLDashboard" component={PRLDashboard} />
        <Stack.Screen name="PRLReports" component={ReportsScreen} />
        <Stack.Screen name="PRLReportDetails" component={ReportDetails} />
        <Stack.Screen name="PLDashboard" component={PLDashboard} />
        <Stack.Screen name="Courses" component={CoursesScreen} />

    


      </Stack.Navigator>
    </NavigationContainer>
  );
}