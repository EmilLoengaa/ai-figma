import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Button, StyleSheet, Keyboard, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Entypo from '@expo/vector-icons/Entypo';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export default function CreateRouteScreen() {
  const [routeName, setRouteName] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [tags, setTags] = useState({
    Svær: false,
    Nem: false,
    Hundevenlig: false,
    Børnevenlig: false,
    Skov: false,
    By: false,
    Pauser: false,
    Kunst: false,
  });
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission needed to access the camera!');
      }
      // Ensure the folder exists
      const folderName = `${FileSystem.documentDirectory}photos/`;
      const folderInfo = await FileSystem.getInfoAsync(folderName);
      if (!folderInfo.exists) {
        await FileSystem.makeDirectoryAsync(folderName, { intermediates: true });
      }
    })();
  }, []);

  const toggleTag = (tagName) => {
    setTags(prevTags => ({ ...prevTags, [tagName]: !prevTags[tagName] }));
  };

  const handleSave = () => {
    Keyboard.dismiss();
    navigation.navigate('Home');
  };

  const openCamera = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.uri) {
      const fileName = result.uri.split('/').pop();
      const newPath = `${FileSystem.documentDirectory}photos/${fileName}`;

      try {
        await FileSystem.moveAsync({
          from: result.uri,
          to: newPath,
        });
        setPhoto(newPath);
      } catch (error) {
        console.error('Error saving photo:', error);
        alert('Failed to save photo. Please try again.');
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Navn på ruten</Text>
      <TextInput
        style={styles.input}
        value={routeName}
        onChangeText={setRouteName}
      />

      <Text style={styles.label}>Beskrivelse</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>Tags til ruten</Text>
      <View style={styles.tagsContainer}>
        {Object.keys(tags).map((tag) => (
          <TouchableOpacity
            key={tag}
            style={[styles.tag, tags[tag] ? styles.activeTag : styles.tag]}
            onPress={() => toggleTag(tag)}
          >
            <Text>{tag}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Billede til ruten?</Text>
      <TouchableOpacity style={styles.imageUpload} onPress={openCamera}>
        <Entypo name="camera" size={24} color="white" />
      </TouchableOpacity>

      {photo && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: `file://${photo}` }} style={styles.imagePreview} />
        </View>
      )}

      <Button title="Gem" onPress={handleSave} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#d1dad3',
  },
  label: {
    fontSize: 18,
    color: '#42617D',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  textArea: {
    height: 100,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  tag: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    width: '48%',
    alignItems: 'center',
  },
  activeTag: {
    backgroundColor: '#A8DDA8',
  },
  imageUpload: {
    backgroundColor: '#3E5641',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
});
