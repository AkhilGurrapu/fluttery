import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:test_flutter_app/main.dart';

void main() {
  testWidgets('Todo app smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const MyApp());

    // Verify that our todo app starts with empty state.
    expect(find.text('No todos yet!'), findsOneWidget);
    expect(find.text('Add one above to get started.'), findsOneWidget);

    // Verify that we can find the input field and add button.
    expect(find.byType(TextField), findsOneWidget);
    expect(find.byIcon(Icons.add), findsOneWidget);

    // Test adding a todo item.
    await tester.enterText(find.byType(TextField), 'Test Todo Item');
    await tester.tap(find.byIcon(Icons.add));
    await tester.pump();

    // Verify the todo item was added.
    expect(find.text('Test Todo Item'), findsOneWidget);
    expect(find.text('No todos yet!'), findsNothing);

    // Verify the counter shows correct numbers.
    expect(find.text('Total: 1 | Completed: 0'), findsOneWidget);
  });

  testWidgets('Todo completion test', (WidgetTester tester) async {
    // Build our app and add a todo item.
    await tester.pumpWidget(const MyApp());
    await tester.enterText(find.byType(TextField), 'Test Todo');
    await tester.tap(find.byIcon(Icons.add));
    await tester.pump();

    // Tap the checkbox to complete the todo.
    await tester.tap(find.byType(Checkbox));
    await tester.pump();

    // Verify the counter updated.
    expect(find.text('Total: 1 | Completed: 1'), findsOneWidget);
  });

  testWidgets('Todo deletion test', (WidgetTester tester) async {
    // Build our app and add a todo item.
    await tester.pumpWidget(const MyApp());
    await tester.enterText(find.byType(TextField), 'Test Todo to Delete');
    await tester.tap(find.byIcon(Icons.add));
    await tester.pump();

    // Tap the delete button.
    await tester.tap(find.byIcon(Icons.delete));
    await tester.pump();

    // Verify the todo was deleted.
    expect(find.text('Test Todo to Delete'), findsNothing);
    expect(find.text('No todos yet!'), findsOneWidget);
    expect(find.text('Total: 0 | Completed: 0'), findsOneWidget);
  });
}
