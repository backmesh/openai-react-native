import EventSource from 'react-native-sse';
import * as FileSystem from 'expo-file-system';
import {
  OpenAI as OpenAINode,
  type ClientOptions as ClientOptionsNode,
} from 'openai';

export type ChatCompletionCallback = (
  data: OpenAINode.Chat.Completions.ChatCompletion
) => void;
export type RunCallback = (data: OpenAINode.Beta.Threads.Run) => void;
export type ErrorCallback = (error: any) => void;
export type OpenCallback = () => void;
export type DoneCallback = () => void;
export type OptionalCallbacks = {
  onError?: ErrorCallback;
  onOpen?: OpenCallback;
  onDone?: DoneCallback;
};
export interface ClientOptions extends ClientOptionsNode {
  apiKey: string;
  baseURL: string;
}

export class OpenAI {
  public apiKey: string;
  public baseURL: string;
  private client: OpenAINode;

  constructor(opts: ClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseURL = opts.baseURL;
    this.client = new OpenAINode(opts);
  }

  public models = {
    list: async () => this.client.models.list(),
  };

  public moderations = {
    create: async (body: OpenAINode.ModerationCreateParams) =>
      this.client.moderations.create(body),
  };

  public beta = {
    assistants: {
      list: async () => this.client.beta.assistants.list(),
    },
    threads: {
      create: async (body?: OpenAINode.Beta.ThreadCreateParams) =>
        this.client.beta.threads.create(body),
      retrieve: async (threadId: string) =>
        this.client.beta.threads.retrieve(threadId),
      update: async (
        threadId: string,
        body: OpenAINode.Beta.ThreadUpdateParams
      ) => this.client.beta.threads.update(threadId, body),
      del: async (threadId: string) => this.client.beta.threads.del(threadId),
      createAndRunPoll: async (
        body: OpenAINode.Beta.ThreadCreateAndRunParamsNonStreaming
      ) => this.client.beta.threads.createAndRunPoll(body),
      runs: {
        stream: (
          threadId: string,
          body: OpenAINode.Beta.Threads.Runs.RunCreateParamsNonStreaming,
          onData: ChatCompletionCallback,
          callbacks: OptionalCallbacks
        ): void =>
          this._stream(
            `${this.baseURL}/threads/${threadId}/runs`,
            body,
            onData,
            callbacks
          ),
      },
    },
  };

  /**
   * Create a chat completion using the OpenAI API.
   * @param {OpenAIParams} params - Parameters for the OpenAI chat completion API.
   * @returns {void}
   */
  public chat = {
    completions: {
      /**
       * Create a chat completion using the OpenAI API.
       * @body {OpenAINode.ChatCompletionCreateParamsNonStreaming} body - Parameters for the OpenAI chat completion API.
       * @returns {Promise<ChatCompletion>}
       */
      create: async (
        body: OpenAINode.ChatCompletionCreateParamsNonStreaming
      ): Promise<OpenAINode.Chat.Completions.ChatCompletion> =>
        this.client.chat.completions.create(body),
      /**
       * Create a chat completion stream using the OpenAI API.
       * @param {OpenAINode.ChatCompletionCreateParamsNonStreaming} params - Parameters for the OpenAI chat completion API since streaming is assumed.
       * @param {ChatCompletionCallback} onData - Callback to handle incoming messages.
       * @param {ErrorCallback} onError - Callback to handle errors.
       * @param {OpenCallback} onOpen - Callback to handle when the connection opens.
       * @returns {EventSource} - The EventSource instance for the stream.
       */
      stream: (
        params: OpenAINode.ChatCompletionCreateParamsNonStreaming,
        onData: ChatCompletionCallback,
        callbacks: OptionalCallbacks
      ): void =>
        this._stream(
          `${this.baseURL}/chat/completions`,
          params,
          onData,
          callbacks
        ),
    },
  };

  public files = {
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
    content: async (fileId: string) => this.client.files.content(fileId),
    delete: async (fileId: string) => this.client.files.del(fileId),
    retrieve: async (fileId: string) => this.client.files.retrieve(fileId),
    list: async () => await this.client.files.list(),
  };

  /**
   * Connect to a given OpenAI API endpoint and start streaming.
   * @param {string} url - The API endpoint to connect to.
   * @param {OpenAIParams} params - The parameters to send with the API request.
   * @param {ChatCompletionCallback | RunCallback} onData - Callback to handle incoming data.
   * @param {Object} callbacks - Object containing callback functions.
   * @param {ErrorCallback} [callbacks.onError] - Callback to handle errors.
   * @param {OpenCallback} [callbacks.onOpen] - Callback to handle when the connection opens.
   * @param {DoneCallback} [callbacks.onDone] - Callback to handle when the stream ends.
   * @private
   */
  private _stream(
    url: string,
    params:
      | OpenAINode.ChatCompletionCreateParamsNonStreaming
      | OpenAINode.Beta.Threads.Runs.RunCreateParamsNonStreaming,
    onData: ChatCompletionCallback | RunCallback,
    callbacks: OptionalCallbacks
  ) {
    const { onError, onOpen, onDone } = callbacks;
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
      if (event.data && event.data !== '[DONE]') {
        try {
          const data = JSON.parse(event.data);
          onData(data);
        } catch (error: any) {
          onError?.(
            new Error(`JSON Parse on ${event.data} with error ${error.message}`)
          );
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
  }
}

export default OpenAI;
