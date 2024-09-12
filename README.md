# Open AI React Native Client

The goal of this library is to use [React Native SSE](https://github.com/binaryminds/react-native-sse) and [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/) instead of polyfills to support calling the OpenAI API directly from React Native with streaming and file upload support. The package uses the same types and API as the [OpenAI Node SDK](https://github.com/openai/openai-node) wherever possible.

> [!CAUTION]
> This package is meant to be used with a proxy to OpenAI like the one [Backmesh](https://backmesh.com) provides. The `baseURL` parameter for this OpenAI client is thus mandatory. If you do not use a proxy and set the baseURL to https://api.openai.com/v1, you are basically exposing your Open AI API key on the internet! You should never expose any secrets in the bundle of a web or mobile app. The correct usage of this client is to create an endpoint on a proxy server for communication with Open AI and then use that endpoint with a user generated auth JWT in your app.

### Contributions and Feature Requests

If you would like to contribute or request a feature, please join our [Discord](https://discord.com/invite/FfYyJfgUUY) and ask questions in the **#oss** channel or create a pull request or issue.

### Setup

Install the package

```bash
npm i openai-react-native
```

And then instantiate the client:

```typescript
import OpenAI from 'openai-react-native';

const client = new OpenAI({
  baseURL:
    'https://edge.backmesh.com/v1/proxy/PyHU4LvcdsQ4gm2xeniAFhMyuDl2/yWo35DdTROVMT52N0qs4/',
  // The backmesh proxy uses your auth provider's JWT to authorize access
  apiKey: supabase.auth.session().access_token,
});
```

### Usage

The streaming APIs uses an [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) from [react-native-sse](https://github.com/binaryminds/react-native-sse) under the hood to provide a required typed `onData` stream event callback and three optional ones: `onDone`, `onOpen` and `onError`.

```typescript
client.chat.completions.stream(
  {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Hello, world!' }],
  },
  (data) => {
    console.log(data.choices[0].delta.content);
    const content = data.choices[0].delta.content;
    if (content) {
      setText((prevText) => prevText + content); // Handle the streaming completion data here
    }
  },
  {
    onError: (error) => {
      console.error('SSE Error:', error); // Handle any errors here
    },
    onOpen: () => {
      console.log('SSE connection for completion opened.'); // Handle when the connection is opened
    },
  }
);
```

The file upload API is async, requires a `purpose` string and leverages the [Expo File System](https://docs.expo.dev/versions/latest/sdk/filesystem/) so only a filepath needs to be provided.

```typescript
try {
  const filePath = FileSystem.documentDirectory + 'data.pdf'; // Adjust the path as needed
  const file = await client.files.create(filePath, 'fine-tune');
  console.log(file);
} catch (error) {
  console.error('File creation error:', error);
}
```

Check the [example](https://github.com/backmesh/openai-react-native/blob/main/sample/app/index.tsx) for more details

## Coverage

- [x] [Chat Completion](https://platform.openai.com/docs/api-reference/chat)
- [x] [Models](https://beta.openai.com/docs/api-reference/models)
- [x] [Files](https://beta.openai.com/docs/api-reference/files)
- [x] [Moderations](https://beta.openai.com/docs/api-reference/moderations)
- [ ] [Images](https://beta.openai.com/docs/api-reference/images)
- [ ] [Audio](https://platform.openai.com/docs/api-reference/audio)
- [ ] [Embeddings](https://platform.openai.com/docs/api-reference/embeddings)

## Beta Coverage

- [x] [Threads](https://beta.openai.com/docs/api-reference/threads)
- [x] [Assistants](https://platform.openai.com/docs/api-reference/assistants)

### License

MIT
