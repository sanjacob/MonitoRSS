import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { DiscordAPIError } from "../../common/errors/DiscordAPIError";
import {
  DiscordChannelNotOwnedException,
  DiscordWebhookInvalidTypeException,
  DiscordWebhookMissingUserPermException,
  DiscordWebhookNonexistentException,
  DiscordWebhookNotOwnedException,
} from "../../common/exceptions";
import { DiscordAuthService } from "../discord-auth/discord-auth.service";
import { DiscordWebhooksService } from "../discord-webhooks/discord-webhooks.service";
import { FeedConnectionType } from "../feeds/constants";
import {
  DiscordChannelConnection,
  DiscordWebhookConnection,
} from "../feeds/entities/feed-connections";
import { Feed, FeedModel } from "../feeds/entities/feed.entity";
import { FeedsService } from "../feeds/feeds.service";
import {
  DiscordChannelPermissionsException,
  MissingDiscordChannelException,
} from "./exceptions";

export interface UpdateDiscordChannelConnectionInput {
  accessToken: string;
  updates: {
    filters?: DiscordChannelConnection["filters"];
    name?: string;
    details?: Partial<DiscordChannelConnection["details"]>;
  };
  guildId: string;
}

@Injectable()
export class FeedConnectionsService {
  constructor(
    private readonly feedsService: FeedsService,
    @InjectModel(Feed.name) private readonly feedModel: FeedModel,
    private readonly discordWebhooksService: DiscordWebhooksService,
    private readonly discordAuthService: DiscordAuthService
  ) {}

  async createDiscordChannelConnection({
    feedId,
    name,
    channelId,
    userAccessToken,
    guildId,
  }: {
    feedId: string;
    name: string;
    channelId: string;
    userAccessToken: string;
    guildId: string;
  }): Promise<DiscordChannelConnection> {
    await this.assertDiscordChannelCanBeUsed(
      userAccessToken,
      channelId,
      guildId
    );

    const connectionId = new Types.ObjectId();

    const updated = await this.feedModel.findOneAndUpdate(
      {
        _id: feedId,
      },
      {
        $push: {
          "connections.discordChannels": {
            id: connectionId,
            name,
            details: {
              type: FeedConnectionType.DiscordChannel,
              channel: {
                id: channelId,
              },
              embeds: [],
            },
          },
        },
      },
      {
        new: true,
      }
    );

    const createdConnection = updated?.connections.discordChannels.find(
      (connection) => connection.id.equals(connectionId)
    );

    if (!createdConnection) {
      throw new Error(
        "Connection was not successfuly created. Check insertion statement and schemas are correct."
      );
    }

    return createdConnection;
  }

  async updateDiscordChannelConnection(
    feedId: string,
    connectionId: string,
    { accessToken, updates, guildId }: UpdateDiscordChannelConnectionInput
  ): Promise<DiscordChannelConnection> {
    if (updates.details?.channel) {
      await this.assertDiscordChannelCanBeUsed(
        accessToken,
        updates.details.channel.id,
        guildId
      );
    }

    const setRecordDetails: Partial<DiscordChannelConnection["details"]> =
      Object.entries(updates.details || {}).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [`connections.discordChannels.$.details.${key}`]: value,
        }),
        {}
      );

    const findQuery = {
      _id: feedId,
      "connections.discordChannels.id": connectionId,
    };

    const updateQuery = {
      $set: {
        ...setRecordDetails,
        ...(updates.filters && {
          [`connections.discordChannels.$.filters`]: updates.filters,
        }),
        ...(updates.name && {
          [`connections.discordChannels.$.name`]: updates.name,
        }),
      },
    };

    const updated = await this.feedModel.findOneAndUpdate(
      findQuery,
      updateQuery,
      {
        new: true,
      }
    );

    const updatedConnection = updated?.connections.discordChannels.find(
      (connection) => connection.id.equals(connectionId)
    );

    if (!updatedConnection) {
      throw new Error(
        "Connection was not successfuly updated. Check insertion statement and schemas are correct."
      );
    }

    return updatedConnection;
  }

  async createDiscordWebhookConnection({
    accessToken,
    feedId,
    guildId,
    name,
    webhook: { id, name: webhookName, iconUrl },
  }: {
    accessToken: string;
    feedId: string;
    guildId: string;
    name: string;
    webhook: {
      id: string;
      name?: string;
      iconUrl?: string;
    };
  }): Promise<DiscordWebhookConnection> {
    const webhook = await this.discordWebhooksService.getWebhook(id);

    if (!webhook) {
      throw new DiscordWebhookNonexistentException(
        `Discord webohok ${id} does not exist`
      );
    }

    if (!this.discordWebhooksService.canBeUsedByBot(webhook)) {
      throw new DiscordWebhookInvalidTypeException(
        `Discord webhook ${id} is a different type and is not operable by bot to send messages`
      );
    }

    if (webhook.guild_id !== guildId) {
      throw new DiscordWebhookNotOwnedException(
        `Discord webhook ${id} is not owned by guild ${guildId}`
      );
    }

    if (
      !(await this.discordAuthService.userManagesGuild(accessToken, guildId))
    ) {
      throw new DiscordWebhookMissingUserPermException(
        `User does not manage guild of webhook webhook ${id}`
      );
    }

    const connectionId = new Types.ObjectId();

    const updated = await this.feedModel.findOneAndUpdate(
      {
        _id: feedId,
      },
      {
        $push: {
          "connections.discordWebhooks": {
            id: connectionId,
            name,
            details: {
              embeds: [],
              webhook: {
                iconUrl,
                id,
                name: webhookName,
                token: webhook.token,
              },
            },
          },
        },
      },
      {
        new: true,
      }
    );

    const createdConnection = updated?.connections.discordWebhooks.find(
      (connection) => connection.id.equals(connectionId)
    );

    if (!createdConnection) {
      throw new Error(
        "Connection was not successfuly created. Check insertion statement and schemas are correct."
      );
    }

    return createdConnection;
  }

  private async assertDiscordChannelCanBeUsed(
    accessToken: string,
    channelId: string,
    guildId: string
  ) {
    try {
      const channel = await this.feedsService.canUseChannel({
        channelId,
        userAccessToken: accessToken,
      });

      if (channel.guild_id !== guildId) {
        throw new DiscordChannelNotOwnedException(
          `Discord channel ${channelId} is not owned by guild ${guildId}`
        );
      }

      return channel;
    } catch (err) {
      if (err instanceof DiscordAPIError) {
        if (err.statusCode === HttpStatus.NOT_FOUND) {
          throw new MissingDiscordChannelException();
        }

        if (err.statusCode === HttpStatus.FORBIDDEN) {
          throw new DiscordChannelPermissionsException();
        }
      }

      throw err;
    }
  }
}
