part of 'conversations_bloc.dart';

abstract class ConversationsEvent extends Equatable {
  const ConversationsEvent();
  @override
  List<Object?> get props => [];
}

class ConversationsStarted extends ConversationsEvent {
  const ConversationsStarted();
}

class ConversationsStopped extends ConversationsEvent {
  const ConversationsStopped();
}

class ConversationsUpdated extends ConversationsEvent {
  final List<Conversation> items;
  const ConversationsUpdated(this.items);
  @override
  List<Object?> get props => [items];
}

class ConversationSelected extends ConversationsEvent {
  final String peerId;
  const ConversationSelected(this.peerId);
  @override
  List<Object?> get props => [peerId];
}

class SearchChanged extends ConversationsEvent {
  final String query;
  const SearchChanged(this.query);
  @override
  List<Object?> get props => [query];
}
