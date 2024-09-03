import {
  OpenAI,
} from '../src/index';

// jest runs in node, but this is needed by react-native-sse
global.XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

// using mocks from https://github.com/openai/openai-node/blob/master/.stats.yml#L2
describe('OpenAI Integration Tests', () => {
  let openAI: OpenAI;

  beforeEach(() => {
    openAI = new OpenAI({
      apiKey: 'test-api-key', // Replace with a valid API key
      baseURL: 'http://127.0.0.1:4010', // Replace with your local server URL
    });
  });

  describe('beta.assistants', () => {
    it('should get assistants', async () => {
      const assistant = await openAI.beta.assistants.list();
      expect(assistant).toBeDefined();
    });
  });

  describe('moderations', () => {
    it('should create moderation', async () => {
      const moderation = await openAI.moderations.create({ input: 'test' });
      expect(moderation).toBeDefined();
      expect(moderation.id).toBeDefined();
    });
  });

  describe('chat.completions', () => {
    it('should create completion', async () => {
      const completion = await openAI.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{"role": "user", "content": "Hello!"}],
      });
      expect(completion).toBeDefined();
      expect(completion.id).toBeDefined();
      const content = completion.choices[0].message;
      expect(content).toBeDefined();
    });
    it('should stream completion', async () => {
      openAI.chat.completions.stream(
        {
          model: 'gpt-4o-mini',
          messages: [{"role": "user", "content": "Hello!"}],
        },
        (completion) => {
          expect(completion).toBeDefined();
          expect(completion.id).toBeDefined();
          const content = completion.choices[0].delta.content;
          expect(content).toBeDefined();
        },
        {
          onError: (error) => expect(error).not.toBeDefined(),
        }
      );
    });
  });

  // https://stackoverflow.com/questions/58262638/why-doesnt-expo-file-system-work-in-jest
  // describe('files', () => {
  //   it('should upload file', async () => {
      // const FileUploadTestComponent = () => {
      //   const [file, setFile] = useState<any | null>(null);
      //   const [error, setError] = useState<any | null>(null);
      
      //   const handleFileUpload = async () => {
      //     try {
      //       const uploadedFile = await openAI.files.create('../README.md', 'fine-tune');
      //       setFile(uploadedFile);
      //     } catch (err) {
      //       setError(err);
      //     }
      //   };
      
      //   return (
      //     <View>
      //       <Button title="Upload File" onPress={handleFileUpload} />
      //       {file && (
      //         <Text>File uploaded successfully: {file.id}</Text>
      //       )}
      //       {error && (
      //         <Text>Error uploading file: {error}</Text>
      //       )}
      //     </View>
      //   );
      // };
      // const { getByText, findByText } = renderer.create(<FileUploadTestComponent />);
      // fireEvent.press(getByText('Upload File'));
  
      // const successMessage = await findByText(/File uploaded successfully:/);
      // expect(successMessage).toBeDefined();

      // const tree = renderer.create(<View>Snapshot test!</View>).toJSON();
      // expect(tree).toMatchSnapshot();

      // const file = await openAI.files.create('../README.md', 'fine-tune');
      // expect(file).toBeDefined();
      // expect(file.id).toBeDefined();
  //   });
  // });
});
