import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';

export default function Feedback({ 
  visible, 
  report, 
  onClose, 
  onSubmit,
  submitting 
}) {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(3);
  const [requiresRevision, setRequiresRevision] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');

  useEffect(() => {
    if (visible) {
      setFeedback('');
      setRating(3);
      setRequiresRevision(false);
      setRevisionNotes('');
      setStrengths('');
      setImprovements('');
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!feedback.trim()) {
      Alert.alert("Error", "Please enter feedback");
      return;
    }
    onSubmit({ feedback, rating, requiresRevision, revisionNotes, strengths, improvements });
  };

  const StarPicker = ({ value, onChange }) => (
    <View style={styles.starRow}>
      {[1,2,3,4,5].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}>
          <Text style={[styles.star, n <= value && styles.starActive]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>PRL Feedback</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView>
            <View style={styles.reportInfo}>
              <Text style={styles.courseName}>{report?.courseName}</Text>
              <Text style={styles.lecturerName}>Lecturer: {report?.lecturerName}</Text>
            </View>
            <Text style={styles.label}>Rating (1-5)</Text>
            <StarPicker value={rating} onChange={setRating} />
            <Text style={styles.label}>Feedback *</Text>
            <TextInput style={styles.textArea} multiline numberOfLines={4} placeholder="Enter feedback..." value={feedback} onChangeText={setFeedback} />
            <Text style={styles.label}>Strengths</Text>
            <TextInput style={styles.textArea} multiline numberOfLines={3} placeholder="What went well?" value={strengths} onChangeText={setStrengths} />
            <Text style={styles.label}>Improvements</Text>
            <TextInput style={styles.textArea} multiline numberOfLines={3} placeholder="What could be better?" value={improvements} onChangeText={setImprovements} />
            <TouchableOpacity style={[styles.revisionBtn, requiresRevision && styles.revisionBtnActive]} onPress={() => setRequiresRevision(!requiresRevision)}>
              <Text>{requiresRevision ? "✓ Needs Revision" : "✓ Approve"}</Text>
            </TouchableOpacity>
            {requiresRevision && (
              <TextInput style={styles.textArea} multiline placeholder="Revision notes..." value={revisionNotes} onChangeText={setRevisionNotes} />
            )}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator size="small" /> : <Text style={styles.submitBtnText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, width: '90%', maxHeight: '85%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  closeBtn: { fontSize: 18, color: '#666' },
  reportInfo: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginBottom: 16 },
  courseName: { fontSize: 16, fontWeight: 'bold' },
  lecturerName: { fontSize: 14, color: '#666' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  textArea: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top' },
  starRow: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 32, color: '#ccc' },
  starActive: { color: '#c9a84c' },
  revisionBtn: { padding: 12, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center', marginTop: 12 },
  revisionBtnActive: { backgroundColor: '#fbbf24' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center' },
  submitBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#0f1f3d', alignItems: 'center' },
  submitBtnText: { color: 'white', fontWeight: 'bold' },
});