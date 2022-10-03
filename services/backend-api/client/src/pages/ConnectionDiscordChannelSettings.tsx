import { EditIcon } from '@chakra-ui/icons';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Grid,
  Heading,
  HStack,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { CategoryText, DiscordMessageForm, DashboardContentV2 } from '../components';
import { DiscordChannelName } from '../features/discordServers';
import { useFeed } from '../features/feed';
import {
  EditConnectionChannelDialog,
  FilterExpression,
  FiltersForm,
  LogicalFilterExpression,
  useDiscordChannelConnection,
  useUpdateDiscordChannelConnection,
} from '../features/feedConnections';
import { DiscordMessageFormData } from '../types/discord';
import RouteParams from '../types/RouteParams';

export const ConnectionDiscordChannelSettings: React.FC = () => {
  const { feedId, serverId, connectionId } = useParams<RouteParams>();
  const {
    feed,
    status: feedStatus,
    error: feedError,
  } = useFeed({
    feedId,
  });
  const {
    connection,
    status: connectionStatus,
    error: connectionError,
  } = useDiscordChannelConnection({
    connectionId,
    feedId,
  });
  const { t } = useTranslation();
  const {
    mutateAsync,
  } = useUpdateDiscordChannelConnection();

  const onFiltersUpdated = async (filters: FilterExpression | null) => {
    if (!feedId || !connectionId) {
      return;
    }

    await mutateAsync({
      feedId,
      connectionId,
      details: {
        filters,
      },
    });
  };

  const onMessageUpdated = async (data: DiscordMessageFormData) => {
    if (!feedId || !connectionId) {
      return;
    }

    await mutateAsync({
      feedId,
      connectionId,
      details: {
        content: data.content,
        embeds: data.embeds,
      },
    });
  };

  const onChannelUpdated = async (data: { channelId?: string, name?: string }) => {
    if (!feedId || !connectionId) {
      return;
    }

    await mutateAsync({
      feedId,
      connectionId,
      details: {
        name: data.name,
        channelId: data.channelId,
      },
    });
  };

  return (
    <DashboardContentV2
      error={feedError || connectionError}
      loading={
        feedStatus === 'loading'
         || feedStatus === 'idle'
          || connectionStatus === 'loading'
           || connectionStatus === 'idle'
      }
    >
      <Tabs isFitted>
        <Stack
          width="100%"
          minWidth="100%"
          paddingTop={12}
          background="gray.700"
          paddingX={{ base: 4, lg: 12 }}
          alignItems="center"
          spacing={0}
        >
          <Stack
            maxWidth="1200px"
            width="100%"
            spacing={12}
          >
            <Stack spacing={6}>
              <Stack
                spacing={4}
              >
                <Box>
                  <Breadcrumb>
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        as={RouterLink}
                        to={`/v2/servers/${serverId}/feeds`}
                      >
                        Feeds
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        as={RouterLink}
                        to={`/v2/servers/${serverId}/feeds/${feedId}`}
                      >
                        {feed?.title}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbItem isCurrentPage>
                      <BreadcrumbLink href="#">Channel</BreadcrumbLink>
                    </BreadcrumbItem>
                  </Breadcrumb>
                  <HStack alignItems="center" justifyContent="space-between">
                    <Heading
                      size="lg"
                      marginRight={4}
                    >
                      Stocks
                    </Heading>
                    <EditConnectionChannelDialog
                      defaultValues={{
                        channelId: 'channel',
                        name: 'hello',
                      }}
                      onUpdate={onChannelUpdated}
                      trigger={(
                        <Button
                          aria-label="Edit"
                          variant="outline"
                          leftIcon={<EditIcon />}
                        >
                          {t('common.buttons.configure')}
                        </Button>
                  )}
                      serverId={serverId}
                    />
                  </HStack>
                </Box>
                <Alert status="error" hidden={feed?.status === 'failed'}>
                  <Box>
                    <AlertTitle>
                      {t('pages.feed.connectionFailureTitle')}
                    </AlertTitle>
                    <AlertDescription display="block">
                      {t('pages.feed.connectionFailureText', {
                        reason: feed?.failReason || t('pages.feed.unknownReason'),
                      })}
                    </AlertDescription>
                  </Box>
                </Alert>
              </Stack>
              <Grid
                templateColumns={{
                  base: '1fr',
                  sm: 'repeat(2, 1fr)',
                  lg: 'repeat(4, fit-content(320px))',
                }}
                columnGap="20"
                rowGap={{ base: '8', lg: '14' }}
              >
                <CategoryText title="Channel">
                  <DiscordChannelName
                    serverId={serverId}
                    channelId={connection
                      ?.details.channel.id as string}
                  />
                </CategoryText>
              </Grid>
            </Stack>
            <TabList>
              <Tab>Message</Tab>
              <Tab>Filters</Tab>
              <Tab>Settings</Tab>
            </TabList>
          </Stack>
        </Stack>
        <TabPanels width="100%" display="flex" justifyContent="center" mt="8">
          <TabPanel maxWidth="1200px" width="100%">
            <Stack>
              <DiscordMessageForm
                defaultValues={{
                  content: connection?.details.content,
                  embeds: connection?.details.embeds,
                }}
                onClickSave={onMessageUpdated}
              />
            </Stack>
          </TabPanel>
          <TabPanel maxWidth="1200px" width="100%">
            <FiltersForm
              onSave={onFiltersUpdated}
              expression={connection?.filters?.expression as LogicalFilterExpression}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </DashboardContentV2>
  );
};