import EventSource from 'react-native-sse';
import * as FileSystem from 'expo-file-system';
import {
  OpenAI as OpenAINode,
  type ClientOptions as ClientOptionsNode,
} from 'openai';

export type onStreamError = (error: any) => void;
export type onStreamOpen = () => void;
export type onStreamDone = () => void;
export type onStreamOptionalEvents = {
  onError?: onStreamError;
  onOpen?: onStreamOpen;
  onDone?: onStreamDone;
};
export interface ClientOptions extends ClientOptionsNode {
  apiKey: string;
  baseURL: string;
}
// export types from OpenAINode
export namespace Chat {
  export namespace Completions {
    export import ChatCompletion = OpenAINode.Chat.Completions.ChatCompletion;
    export type onStreamData = (
      data: OpenAINode.Chat.Completions.ChatCompletion
    ) => void; // specific to this library
  }
}
export import ChatCompletionCreateParamsNonStreaming = OpenAINode.ChatCompletionCreateParamsNonStreaming;

export namespace Moderation {
  export import Categories = OpenAINode.Moderation.Categories;
  export interface Moderation extends OpenAINode.Moderation {}
}
export import ModerationCreateResponse = OpenAINode.ModerationCreateResponse;
export import ModerationCreateParams = OpenAINode.ModerationCreateParams;
export import Model = OpenAINode.Model;
export namespace Beta {
  export import ThreadCreateParams = OpenAINode.Beta.ThreadCreateParams;
  export import Thread = OpenAINode.Beta.Thread;
  export import ThreadUpdateParams = OpenAINode.Beta.ThreadUpdateParams;
  export import ThreadCreateAndRunParamsNonStreaming = OpenAINode.Beta.ThreadCreateAndRunParamsNonStreaming;
  export import ThreadDeleted = OpenAINode.Beta.ThreadDeleted;
  export import Assistant = OpenAINode.Beta.Assistant;
  export namespace Threads {
    export import Run = OpenAINode.Beta.Threads.Run;
    export namespace Runs {
      export type RunCreateParamsNonStreaming =
        OpenAINode.Beta.Threads.Runs.RunCreateParamsNonStreaming;
      export type onStreamData = (data: OpenAINode.Beta.Threads.Run) => void; // specific to this library
    }
    export import Message = OpenAINode.Beta.Threads.Message;
    export namespace Messages {
      export import MessageCreateParams = OpenAINode.Beta.Threads.Messages.MessageCreateParams;
      export import MessageListParams = OpenAINode.Beta.Threads.Messages.MessageListParams;
      export import MessageDeleted = OpenAINode.Beta.Threads.Messages.MessageDeleted;
    }
  }
}
export import FileObject = OpenAINode.FileObject;
export import FileContent = OpenAINode.FileContent;
export import FileDeleted = OpenAINode.FileDeleted;

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
    list: async (): Promise<Model[]> => (await this.client.models.list()).data,
  };

  public moderations = {
    create: async (
      body: ModerationCreateParams
    ): Promise<ModerationCreateResponse> =>
      this.client.moderations.create(body),
  };

  public beta = {
    assistants: {
      list: async (): Promise<Beta.Assistant[]> =>
        (await this.client.beta.assistants.list()).data,
    },
    threads: {
      create: async (body?: Beta.ThreadCreateParams): Promise<Beta.Thread> =>
        this.client.beta.threads.create(body),
      retrieve: async (threadId: string): Promise<Beta.Thread> =>
        this.client.beta.threads.retrieve(threadId),
      update: async (
        threadId: string,
        body: Beta.ThreadUpdateParams
      ): Promise<Beta.Thread> =>
        this.client.beta.threads.update(threadId, body),
      del: async (threadId: string): Promise<Beta.ThreadDeleted> =>
        this.client.beta.threads.del(threadId),
      createAndRunPoll: async (
        body: Beta.ThreadCreateAndRunParamsNonStreaming
      ): Promise<Beta.Threads.Run> =>
        this.client.beta.threads.createAndRunPoll(body),
      messages: {
        list: async (
          threadId: string,
          query?: Beta.Threads.Messages.MessageListParams
        ): Promise<Beta.Threads.Message[]> =>
          (await this.client.beta.threads.messages.list(threadId, query)).data,
        del: async (
          threadId: string,
          messageId: string
        ): Promise<Beta.Threads.Messages.MessageDeleted> =>
          await this.client.beta.threads.messages.del(threadId, messageId),
        create: async (
          threadId: string,
          body: Beta.Threads.Messages.MessageCreateParams
        ): Promise<Beta.Threads.Message> =>
          await this.client.beta.threads.messages.create(threadId, body),
      },
      runs: {
        stream: (
          threadId: string,
          body: Beta.Threads.Runs.RunCreateParamsNonStreaming,
          onData: Chat.Completions.onStreamData,
          callbacks: onStreamOptionalEvents
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
       * @body {ChatCompletionCreateParamsNonStreaming} body - Parameters for the OpenAI chat completion API.
       * @returns {Promise<ChatCompletion>}
       */
      create: async (
        body: ChatCompletionCreateParamsNonStreaming
      ): Promise<Chat.Completions.ChatCompletion> =>
        this.client.chat.completions.create(body),
      /**
       * Create a chat completion stream using the OpenAI API.
       * @param {ChatCompletionCreateParamsNonStreaming} params - Parameters for the OpenAI chat completion API since streaming is assumed.
       * @param {Chat.Completions.onStreamData} onData - Callback to handle incoming messages.
       * @param {onStreamOptionalEvents} callbacks - Object containing optional callback functions.
       * @returns {void}
       */
      stream: (
        params: ChatCompletionCreateParamsNonStreaming,
        onData: Chat.Completions.onStreamData,
        callbacks: onStreamOptionalEvents
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
    create: async (filePath: string, purpose: string): Promise<FileObject> => {
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
      const responseData: FileObject = JSON.parse(response.body);
      return responseData;
    },
    content: async (fileId: string): Promise<Response> =>
      this.client.files.content(fileId),
    delete: async (fileId: string): Promise<FileDeleted> =>
      this.client.files.del(fileId),
    retrieve: async (fileId: string): Promise<FileObject> =>
      this.client.files.retrieve(fileId),
    list: async (): Promise<FileObject[]> =>
      (await this.client.files.list()).data,
  };

  /**
   * Connect to a given OpenAI API endpoint and start streaming.
   * @param {string} url - The API endpoint to connect to.
   * @param {OpenAIParams} params - The parameters to send with the API request.
   * @param {ChatCompletionCallback | RunCallback} onData - Callback to handle incoming data.
   * @param {onStreamOptionalEvents} callbacks - Object containing callback functions.
   * @param {onStreamError} [callbacks.onError] - Callback to handle errors.
   * @param {onStreamOpen} [callbacks.onOpen] - Callback to handle when the connection opens.
   * @param {onStreamDone} [callbacks.onDone] - Callback to handle when the stream ends.
   * @private
   */
  private _stream(
    url: string,
    params:
      | ChatCompletionCreateParamsNonStreaming
      | Beta.Threads.Runs.RunCreateParamsNonStreaming,
    onData: Chat.Completions.onStreamData | Beta.Threads.Runs.onStreamData,
    callbacks: onStreamOptionalEvents
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
