/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import classNames from 'classnames';

import React, { useEffect, useRef, useState } from 'react';
import { UserWarning } from './UserWarning';
import * as todoService from './api/todos';
import { Filter } from './utils/Filter';
import { Todo } from './types/todo';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);

  useEffect(() => {
    todoService
      .getTodos()
      .then(setTodos)
      .catch(() => {
        setErrorMessage('Unable to load todos');
      });
  }, []);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setErrorMessage('');
    }, 3000);

    return () => clearTimeout(timer);
  }, [errorMessage]);

  const filteredTodos = todos.filter(todo => {
    switch (filter) {
      case 'active':
        return !todo.completed;

      case 'completed':
        return todo.completed;

      default:
        return true;
    }
  });

  const addTodo = ({ title, completed, userId }: Omit<Todo, 'id'>) => {
    setTempTodo({ id: 0, title, completed, userId });
    setIsLoading(true);

    todoService
      .createTodo({ title, completed, userId })
      .then(newTodo => {
        setTodos(currentTodos => [...currentTodos, newTodo]);
        setQuery('');
      })
      .catch(() => {
        setErrorMessage('Unable to add a todo');
      })
      .finally(() => {
        setTempTodo(null);
        setIsLoading(false);
      });
  };

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!query.trim()) {
      setErrorMessage('Title should not be empty');

      return;
    }

    addTodo({
      title: query.trim(),
      completed: false,
      userId: todoService.USER_ID,
    });
  };

  const deleteTodo = (todoId: number) => {
    setLoadingIds(current => [...current, todoId]);

    todoService
      .deleteTodo(todoId)
      .then(() => {
        setTodos(currentTodos =>
          currentTodos.filter(todo => todo.id !== todoId),
        );
      })
      .catch(() => {
        setErrorMessage('Unable to delete a todo');
      })
      .finally(() => {
        setLoadingIds(current => current.filter(id => id !== todoId));
        inputRef.current?.focus();
      });
  };

  const clearCompleted = () => {
    const completedTodos = todos.filter(todo => todo.completed);

    setLoadingIds(current => [
      ...current,
      ...completedTodos.map(todo => todo.id),
    ]);

    Promise.allSettled(
      completedTodos.map(todo => todoService.deleteTodo(todo.id)),
    ).then(results => {
      const failedInds = results.some(result => result.status === 'rejected');

      if (failedInds) {
        setErrorMessage('Unable to delete a todo');
      }

      const successfulIds = results
        .map((result, index) =>
          result.status === 'fulfilled' ? completedTodos[index].id : -1,
        )
        .filter(id => id !== -1);

      setTodos(current =>
        current.filter(todo => !successfulIds.includes(todo.id)),
      );

      inputRef.current?.focus();
    });
  };

  if (!todoService.USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {/* this button should have `active` class only if all todos are completed */}
          <button
            type="button"
            className={classNames('todoapp__toggle-all', {
              active: todos.every(todo => todo.completed),
            })}
            data-cy="ToggleAllButton"
          />

          {/* Add a todo on form submit */}
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={query}
              onChange={event => {
                setQuery(event.target.value);
              }}
              disabled={isLoading}
            />
          </form>
        </header>

        {todos.length > 0 && (
          <section className="todoapp__main" data-cy="TodoList">
            {filteredTodos.map(todo => (
              <div
                key={todo.id}
                data-cy="Todo"
                className={classNames('todo', {
                  completed: todo.completed,
                })}
              >
                <label className="todo__status-label">
                  <input
                    data-cy="TodoStatus"
                    type="checkbox"
                    className="todo__status"
                    checked={todo.completed}
                  />
                </label>

                <span data-cy="TodoTitle" className="todo__title">
                  {todo.title}
                </span>

                {/* Remove button appears only on hover */}
                <button
                  type="button"
                  className="todo__remove"
                  data-cy="TodoDelete"
                  onClick={() => deleteTodo(todo.id)}
                >
                  ×
                </button>

                {/* overlay will cover the todo while it is being deleted or updated */}
                <div
                  data-cy="TodoLoader"
                  className={classNames('modal overlay', {
                    'is-active': loadingIds.includes(todo.id),
                  })}
                >
                  <div className="modal-background has-background-white-ter" />
                  <div className="loader" />
                </div>
              </div>
            ))}

            {tempTodo && (
              <div
                data-cy="Todo"
                className={classNames('todo', {
                  completed: tempTodo.completed,
                })}
              >
                <label className="todo__status-label">
                  <input
                    data-cy="TodoStatus"
                    type="checkbox"
                    className="todo__status"
                    checked={tempTodo.completed}
                  />
                </label>

                <span data-cy="TodoTitle" className="todo__title">
                  {tempTodo.title}
                </span>

                {/* overlay will cover the todo while it is being deleted or updated */}
                <div data-cy="TodoLoader" className="modal overlay is-active">
                  <div className="modal-background has-background-white-ter" />
                  <div className="loader" />
                </div>
              </div>
            )}

            {/* This is a completed todo */}

            {/* This todo is an active todo */}

            {/* This todo is being edited */}

            {/* This todo is in loadind state */}
          </section>
        )}

        {/* Hide the footer if there are no todos */}
        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {todos.filter(t => !t.completed).length} items left
            </span>

            {/* Active link should have the 'selected' class */}
            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={classNames('filter__link', {
                  selected: filter === 'all',
                })}
                data-cy="FilterLinkAll"
                onClick={event => {
                  event.preventDefault();

                  setFilter('all');
                }}
              >
                All
              </a>

              <a
                href="#/active"
                className={classNames('filter__link', {
                  selected: filter === 'active',
                })}
                data-cy="FilterLinkActive"
                onClick={event => {
                  event.preventDefault();

                  setFilter('active');
                }}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={classNames('filter__link', {
                  selected: filter === 'completed',
                })}
                data-cy="FilterLinkCompleted"
                onClick={event => {
                  event.preventDefault();

                  setFilter('completed');
                }}
              >
                Completed
              </a>
            </nav>

            {/* this button should be disabled if there are no completed todos */}
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={!todos.some(t => t.completed)}
              onClick={clearCompleted}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      {/* DON'T use conditional rendering to hide the notification */}
      {/* Add the 'hidden' class to hide the message smoothly */}
      <div
        data-cy="ErrorNotification"
        className={classNames(
          'notification is-danger is-light has-text-weight-normal',
          {
            hidden: !errorMessage,
          },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setErrorMessage('')}
        />
        {/* show only one message at a time */}
        {errorMessage}
      </div>
    </div>
  );
};
