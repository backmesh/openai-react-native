import EventSource from 'react-native-sse';
import * as FileSystem from 'expo-file-system';
import {
  OpenAI as OpenAINode,
  type ClientOptions as ClientOptionsNode,
} from 'openai';

type MessageCallback = (data: any) => void;
type ErrorCallback = (error: any) => void;
type OpenCallback = () => void;
type DoneCallback = () => void;

interface ClientOptions extends ClientOptionsNode {
  apiKey: string;
  baseURL: string;
}

export class OpenAI {
  private apiKey: string;
  private baseURL: string;
  private client: OpenAINode;
  public files: {
    create: (
      filePath: string,
      purpose: string
    ) => Promise<OpenAINode.FileObject>;
    content: typeof OpenAINode.prototype.files.content;
    delete: typeof OpenAINode.prototype.files.del;
    retrieve: typeof OpenAINode.prototype.files.retrieve;
    list: typeof OpenAINode.prototype.files.list;
  };
  public moderations: OpenAINode.Moderations;
  public models: OpenAINode.Models;

  constructor(opts: ClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseURL = opts.baseURL;
    this.client = new OpenAINode(opts);
    this.files = {
      /**
       * Upload file using the Expo FileSystem to the OpenAI API /v1/files endpoints
       * @param {string} filePath - The path of the file to upload.
       * @param {string} purpose - The purpose of the data (e.g., "fine-tune").
       * @see {@link https://docs.expo.dev/versions/latest/sdk/filesystem/ Expo FileSystem}
       * @see {@link https://beta.openai.com/docs/api-reference/files OpenAI Files API}
       * @returns {Promise<FileObject>}
       */
      create: async (
        filePath: string,
        purpose: string
      ): Promise<OpenAINode.FileObject> => {
        const response = await FileSystem.uploadAsync(
          `${this.baseURL}/files`,
          filePath,
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
            httpMethod: 'POST',
            fieldName: 'file',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            parameters: {
              purpose: purpose,
            },
          }
        );
        const responseData: OpenAINode.FileObject = JSON.parse(response.body);
        return responseData;
      },
      content: this.client.files.content,
      delete: this.client.files.del,
      retrieve: this.client.files.retrieve,
      list: this.client.files.list,
    };
    this.moderations = this.client.moderations;
    this.models = this.client.models;
  }

  /**
   * Create a chat completion using the OpenAI API.
   * @param {OpenAIParams} params - Parameters for the OpenAI chat completion API.
   * @returns {void}
   */
  public chat = {
    completions: {
      /**
       * Create a chat completion using the OpenAI API.
       * @param {OpenAINode.ChatCompletionCreateParamsNonStreaming} params - Parameters for the OpenAI chat completion API.
       * @returns {Promise<ChatCompletion>}
       */
      create: async (
        params: OpenAINode.ChatCompletionCreateParamsNonStreaming
      ): Promise<OpenAINode.Chat.Completions.ChatCompletion> =>
        this.client.chat.completions.create(params),
      /**
       * Create a chat completion stream using the OpenAI API.
       * @param {OpenAINode.ChatCompletionCreateParamsNonStreaming} params - Parameters for the OpenAI chat completion API since streaming is assumed.
       * @param {MessageCallback} onMessage - Callback to handle incoming messages.
       * @param {ErrorCallback} onError - Callback to handle errors.
       * @param {OpenCallback} onOpen - Callback to handle when the connection opens.
       * @returns {EventSource} - The EventSource instance for the stream.
       */
      stream: (
        params: OpenAINode.ChatCompletionCreateParamsNonStreaming,
        onMessage: MessageCallback,
        onError: ErrorCallback,
        onOpen?: OpenCallback,
        onDone?: DoneCallback
      ): EventSource => {
        return this._stream(
          `${this.baseURL}/chat/completions`,
          params,
          onMessage,
          onError,
          onOpen,
          onDone
        );
      },
    },
  };

  /**
   * Connect to a given OpenAI API endpoint and start streaming.
   * @param {string} url - The API endpoint to connect to.
   * @param {OpenAIParams} params - The parameters to send with the API request.
   * @param {MessageCallback} onMessage - Callback to handle incoming messages.
   * @param {ErrorCallback} onError - Callback to handle errors.
   * @param {OpenCallback} onOpen - Callback to handle when the connection opens.
   * @returns {EventSource}
   * @private
   */
  private _stream(
    url: string,
    params: OpenAINode.ChatCompletionCreateParamsNonStreaming,
    onMessage: MessageCallback,
    onError: ErrorCallback,
    onOpen?: OpenCallback,
    onDone?: DoneCallback
  ): EventSource {
    const requestBody = { ...params, stream: true };

    const eventSource = new EventSource(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    eventSource.addEventListener('message', (event) => {
      if (event.data) {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (error: any) {
          onError?.(new Error(`JSON Parse error: ${error.message}`));
          eventSource.close(); // Disconnect the EventSource
        }
      } else {
        onDone?.(); // Call onDone when the stream ends
        eventSource.close(); // Disconnect the EventSource
      }
    });

    eventSource.addEventListener('error', (error) => {
      onError?.(error);
      eventSource.close(); // Disconnect the EventSource
    });

    eventSource.addEventListener('open', () => {
      onOpen?.();
    });

    return eventSource;
  }
}

export default OpenAI;
