import { StyleSheet, Text, TextInput } from 'react-native';
import React, { useState, useEffect } from 'react';
import OpenAI, { ChatCompletion } from 'openai-react-native';
import { Button, View } from 'react-native';
import * as FileSystem from 'expo-file-system';


import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from "firebase/auth";

// Initialize Firebase
// TODO replace with your Firebase Project config
const firebaseConfig = {
  apiKey: 'AIzaSyAddbefeeNCjWxChVGerxW1lZqDN8XlWUU',
  authDomain: 'openai-react-native.firebaseapp.com',
  projectId: 'openai-react-native',
};

export default function HomeScreen() {
  const [text, setText] = useState<string>('');
  const [fileDetails, setFileDetails] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [files, setFiles] = useState<string>('');
  const [client, setClient] = useState<OpenAI | null>(null);
  const [userInput, setUserInput] = useState<string>(''); // New state for user input


  useEffect(() => {
    const initializeClient = async () => {
      initializeApp(firebaseConfig);
      const auth = getAuth();
      const creds = await signInAnonymously(auth);
      const newClient = new OpenAI({
        baseURL: 'https://edge.backmesh.com/v1/proxy/PyHU4LvcdsQ4gm2xeniAFhMyuDl2/K2G8ucCHwh5zN6CLEGeL/v1',
        apiKey: await creds.user.getIdToken(),
      });
      setClient(newClient);
    };

    initializeClient();
  }, []);

  const startStreaming = async () => {
    if (!client) return;
    setText('');
    client.chat.completions.stream(
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: userInput }],
      },
      (data: ChatCompletion) => {
        const content = data.choices[0].delta?.content;
        if (content) {
          setText((prevText) => prevText + content); // Handle the streaming completion data here
        }
      }, {
        onError: (error) => {
          console.error('SSE Error:', error); // Handle any errors here
        },
        onOpen: () => {
          setUserInput('');
          console.log('SSE connection for completion opened.'); // Handle when the connection is opened
        },
        onDone: () => {
          console.log('SSE connection for completion closed.'); // Handle when the connection is opened
        },
      }
    );
  };

  const uploadFile = async () => {
    if (!client) return;
    try {
      const filePath = FileSystem.documentDirectory + 'example.txt';
      await FileSystem.writeAsStringAsync(filePath, 'Hello, world!');
      const file = await client.files.create(
        filePath,
        'fine-tune',
      );
      setFileDetails(JSON.stringify(file, null, 4));
      // const content = await client.files.content(file.id);
      // setFileContent(JSON.stringify(content, null, 4));
      const files = await client.files.list();
      setFiles(JSON.stringify(files, null, 4));
    } catch (err) {
      console.error(err);
    }
  };

  return (
      <View style={styles.buttonContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter your message"
          value={userInput}
          onChangeText={setUserInput}
        />
        <Button title="Start Streaming" onPress={startStreaming} />
        <Text style={styles.header}>chat complete streaming:</Text>
        <Text>{text}</Text>
        <Button title="Upload sample file" onPress={uploadFile} />
        <Text style={styles.header}>uploaded file object</Text>
        <Text>{fileDetails}</Text>
        {/* <Text style={styles.header}>uploaded file contents:</Text>
        <Text>{fileContent}</Text> */}
        <Text style={styles.header}>all files:</Text>
        <Text>{files}</Text>

      </View>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  header: {
    marginVertical: 8,
    fontWeight: 'bold',
    fontSize: 18,
  },
  buttonContainer: {
    margin: 16,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
});