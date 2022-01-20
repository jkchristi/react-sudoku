import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import reportWebVitals from './reportWebVitals';
import SudokuSolver from './solver.js';

//These four constants are used for determining how to draw the thicker borders that divide the boxes of the board
const NONE = 0;
const RIGHT = 1;
const BOTTOM = 2;
const BOTTOM_RIGHT = 3;

const NUM_ROWS = 9;
const NUM_COLUMNS = 9;
const NUM_BOXES = 9;

class Square extends React.Component
{
  constructor(props)
  {
    super(props);
    this.state = 
    {
      selected: false
    };
  }

  render()
  {
    let className;
    if (this.state.selected)
    {
      className = "square-selected";
    }
    else
    {
      className = "square";
    }

    if (this.props.thickBorder == RIGHT)
    {
      className += " thick-right";
    }
    else if (this.props.thickBorder == BOTTOM)
    {
      className += " thick-bottom";
    }
    else if (this.props.thickBorder == BOTTOM_RIGHT)
    {
      className += " thick-bottom thick-right";
    }

    if (this.props.changeable)
    {
      if (this.props.duplicate)
      {
        className += " text-red"; //only display the red text on changeable squares 
      }
      else
      {
        className += " text-purple";
      }
    }

    if(this.props.selected)
    {
      className += " selected";
    }
    else
    {
      className += " not-selected";
    }

    return (
      <button className={className} onClick={this.props.onClick}>{this.props.value}</button>
    );
      
  }
}

// GameStatus returns the part of the UI that shows the user how much progress they've made towards winning
function GameStatus(props)
{
  //If the user has won, display text saying they've won:
  if (props.rowsLeft == 0 && props.columnsLeft == 0 && props.boxesLeft == 0)
  {
    return (
      <div className="game-info">
        <div>{"You win!"}</div>
      </div>
    )
  }

  //Otherwise, show the number of rows, columns, and boxes that haven't been solved yet:
  return (
    <div className="game-info">
      <div>{"Rows: " + props.rowsLeft + " left"}</div>
      <div>{"Columns: " + props.columnsLeft + " left"}</div>
      <div>{"Boxes: " + props.boxesLeft + " left"}</div>
   </div>
  )
}

// BoardInfo stores information about the board, like which numbers are already in each row
class BoardInfo
{
  constructor()
  {
    //rowCounts[i][j] represents how many of the number j exist in row i
    //j = 0 should be ignored
    //columnCounts is similar but for columns 
    this.rowCounts = new Array(NUM_ROWS).fill(null);
    this.columnCounts = new Array(NUM_COLUMNS).fill(null);

    //boxCounts[i][j][n] represents how many of the number n exist in the box with coordinates (i, j)
    //n = 0 should be ignored
    this.boxCounts = new Array(NUM_BOXES / 3).fill(null);

    //Initialize rowCounts and columnCounts:
    for (let i = 0; i < NUM_ROWS; ++i)
    {
      this.rowCounts[i] = new Array(10).fill(0);
      this.columnCounts[i] = new Array(10).fill(0);
    }

    //Initialize boxCounts:
    for (let i = 0; i < NUM_BOXES / 3; ++i)
    {
      this.boxCounts[i] = new Array(3).fill(null)
      for (let j = 0; j < 3; ++j)
      {
        this.boxCounts[i][j] = new Array(10).fill(0);
      }
    }
  }

  copy()
  {
    let copyBoardInfo = new BoardInfo();
    copyBoardInfo.rowCounts = this.rowCounts.slice();
    copyBoardInfo.columnCounts = this.columnCounts.slice();
    copyBoardInfo.boxCounts = this.boxCounts.slice();
    return copyBoardInfo;
  }

  countNumInRow(x, y, number)
  {
    return this.rowCounts[y][number];
  }

  countNumInColumn(x, y, number)
  {
    return this.columnCounts[x][number];
  }

  countNumInBox(x, y, number)
  {
    let boxCoordinates = this.getBoxCoordinates(x, y);
    return this.boxCounts[boxCoordinates[1]][boxCoordinates[0]][number];
  }

  //Takes (x,y)-coordinates and gets the coordinates (in the 3x3 grid of boxes) of the box they belong to 
  getBoxCoordinates(x, y)
  {
    return [Math.floor(x/3), Math.floor(y/3)];
  }

  //Returns true if the number in position (x, y) is a duplicate (already exists in the same row, column, or box)
  isDuplicate(x, y, number)
  {
    return (this.countNumInRow(x, y, number) > 1) || (this.countNumInColumn(x, y, number) > 1) || (this.countNumInBox(x, y, number) > 1);
  }

  increment(x, y, number)
  {
    let boxCoordinates = this.getBoxCoordinates(x, y);

    ++this.rowCounts[y][number];
    ++this.columnCounts[x][number];
    ++this.boxCounts[boxCoordinates[1]][boxCoordinates[0]][number];
  }

  decrement(x, y, number)
  {
    let boxCoordinates = this.getBoxCoordinates(x, y);

    --this.rowCounts[y][number];
    --this.columnCounts[x][number];
    --this.boxCounts[boxCoordinates[1]][boxCoordinates[0]][number];
  }
}

class Game extends React.Component
{
  constructor(props)
  {
    super(props);
    this.state = {
      board: Array(NUM_ROWS).fill(null),
      changeable: Array(NUM_ROWS).fill(null),
      duplicates: Array(NUM_ROWS).fill(null),
      // I kinda feel at this point there should just be one array of a SquareInfo class or something
      selectedX: null,
      selectedY: null,
      boardInfo: new BoardInfo()
    }
    for (let i = 0; i < this.state.board.length; i++)
    {
      this.state.board[i] = Array(NUM_COLUMNS).fill(null);
      this.state.changeable[i] = Array(NUM_COLUMNS).fill(true);
      this.state.duplicates[i] = Array(NUM_COLUMNS).fill(false);
    }
    this.initializeGame();
  }

  initializeGame()
  {
    this.initializeSquare(0, 0, 5);
    this.initializeSquare(0, 1, 3);
    this.initializeSquare(0, 4, 7);

    this.initializeSquare(1, 0, 6);
    this.initializeSquare(1, 3, 1);
    this.initializeSquare(1, 4, 9);
    this.initializeSquare(1, 5, 5);

    this.initializeSquare(2, 1, 9);
    this.initializeSquare(2, 2, 8);
    this.initializeSquare(2, 7, 6);

    this.initializeSquare(3, 0, 8);
    this.initializeSquare(3, 4, 6);
    this.initializeSquare(3, 8, 3);

    this.initializeSquare(4, 0, 4);
    this.initializeSquare(4, 3, 8);
    this.initializeSquare(4, 5, 3);
    this.initializeSquare(4, 8, 1);

    this.initializeSquare(5, 0, 7);
    this.initializeSquare(5, 4, 2);
    this.initializeSquare(5, 8, 6);

    this.initializeSquare(6, 1, 6);
    this.initializeSquare(6, 6, 2);
    this.initializeSquare(6, 7, 8);

    this.initializeSquare(7, 3, 4);
    this.initializeSquare(7, 4, 1);
    this.initializeSquare(7, 5, 9);
    this.initializeSquare(7, 8, 5);

    this.initializeSquare(8, 4, 8);
    this.initializeSquare(8, 7, 7);
    this.initializeSquare(8, 8, 9);
  }

  initializeSquare(i, j, value)
  {
    let newBoard = this.state.board.slice();
    let newChangeable = this.state.changeable.slice();

    newBoard[i][j] = value;
    newChangeable[i][j] = false;

    let boardInfoCopy = this.state.boardInfo.copy();
    boardInfoCopy.increment(j, i, value);

    this.setState({
      board: newBoard,
      changeable: newChangeable,
      boardInfo: boardInfoCopy
    });
  }

  renderSquare(i, j, thickBorder) 
  {
    let changeable = false; //if true, will make the number purple to indicate it can be changed
    let selected = false; //if true, highlights the square in yellow to indicate it is selected
    let markDuplicate = false; //if true, makes the number in the square red

    changeable = this.state.changeable[i][j] ? true : false;

    if (this.state.boardInfo.isDuplicate(j, i, this.state.board[i][j])) 
    {
      markDuplicate = true;
    }

    selected = (this.state.selectedX == j && this.state.selectedY == i) ? true : false;

    return (<Square thickBorder={thickBorder} changeable={changeable} selected={selected} duplicate={markDuplicate} value={this.state.board[i][j]}
     onClick={() => this.handleClick(i, j)}/>);
  }

  //Renders a square representing whether a specific row is complete or not
  renderRowStatus(isComplete)
  {
    if (isComplete)
    {
      return <button className={"row-status-square-complete"}></button>
    }
    else
    {
      return <button className={"row-status-square-incomplete"}></button>

    }
  }

  //Renders a square representing whether a specific column is complete or not
  renderColumnStatus(isComplete)
  {
    if (isComplete)
    {
      return <button className={"column-status-square-complete"}></button>
    }
    else
    {
      return <button className={"column-status-square-incomplete"}></button>
    }
  }

  renderBoxStatus(isComplete)
  {
    if (isComplete)
    {
      return <button className={"box-status-square-complete"}></button>
    }
    return <button className={"box-status-square-incomplete"}></button>
  }

  //Handles the user clicking on the game board
  //Effect is that a square is selected (if its value is allowed to be changed)
  handleClick(i, j)
  {
    if (this.state.changeable[i][j])
    {
      this.setState(
        {
          selectedY: i,
          selectedX: j
        }
      );
    }
  }

  //Handles keyboard input
  //Effect is on the currently selected square, either changing or removing its value
  handleKeyDown(event)
  {
    let validKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Delete'];

    if (this.state.selectedX != null && validKeys.includes(event.key))
    {
      let boardCopy = this.state.board.slice();
      let boardInfoCopy = this.state.boardInfo.copy();

      if (event.key == 'Delete')
      {
        this.handleValueDelete(boardCopy, boardInfoCopy);
      }
      else
      {
        let newNum = parseInt(event.key);
        this.handleValueSet(boardCopy, boardInfoCopy, newNum);
      }

      this.setState(
        {
          board: boardCopy,
          boardInfo: boardInfoCopy
        }
      );
    }
  }

  //Handles when the user deletes a value from the board
  handleValueDelete(board, boardInfo)
  {
    let removedNumber = board[this.state.selectedY][this.state.selectedX];
    board[this.state.selectedY][this.state.selectedX] = null;
    boardInfo.decrement(this.state.selectedX, this.state.selectedY, removedNumber);
  }

  //Handles when the user sets a square to a value
  handleValueSet(board, boardInfo, newNum)
  {
    let oldNum = board[this.state.selectedY][this.state.selectedX];
    board[this.state.selectedY][this.state.selectedX] = newNum;
    boardInfo.decrement(this.state.selectedX, this.state.selectedY, oldNum);
    boardInfo.increment(this.state.selectedX, this.state.selectedY, newNum);
  }

  //Returns true if an array has no nulls or duplicate values
  //Should be called on an array representing a row, column, or box
  checkCompleted(array)
  {
    let nums = new Set();
    for (let i = 0; i < array.length; ++i)
    {
      if (!array[i] || nums.has(array[i]))
      {
        return false; //return false if there is a null or duplicate
      }
      nums.add(array[i]);
    }
    return true;
  }

  ///Returns a copy of the ith column
  getColumn(i)
  {
    let column = new Array();
    for (let x = 0; x < NUM_ROWS; ++x)
    {
      column.push(this.state.board[x][i]);
    }
    return column;
  }

  //Takes the top-left point of a 3x3 box and returns an array containing all of that box's values
  getBoxFromTopLeft(i, j)
  {
    let box = new Array();
    for (let x = i; x < i + 3; ++x)
    {
      for (let y = j; y < j + 3; ++y)
      {
        box.push(this.state.board[x][y]);
      }
    }
    return box;
  }

  //Returns an array representing the completion status of each row
  calculateRowStatuses()
  {
    let rows = new Array(NUM_ROWS).fill(false);
    for (let i = 0; i < NUM_ROWS; ++i)
    {
      const rowCopy = this.state.board[i].slice();
      if (this.checkCompleted(rowCopy))
      {
        rows[i] = true;
      }
    }
    return rows;
  }

  //Returns an array representing the completion status of each column
  calculateColumnStatuses()
  {
    let columns = new Array(NUM_COLUMNS).fill(false);
    for (let i = 0; i < NUM_COLUMNS; ++i)
    {
      let currentColumn = this.getColumn(i);
      if (this.checkCompleted(currentColumn))
      {
        columns[i] = true;
      }
    }
    return columns;
  }

  //Returns an array representing the completion status of each box
  calculateBoxStatuses()
  {
    let i = 0;
    let boxes = new Array(9).fill(false);
    for (let x = 0; x <= 6; x += 3)
    {
      for (let y = 0; y <= 6; y += 3)
      {
        let box = this.getBoxFromTopLeft(x, y);
        if (this.checkCompleted(box))
        {
          boxes[i] = true;
        }
        ++i;
      }
    }
    return boxes;
  }

  //Takes an array of boolean values and returns the number of false values
  countRemaining(arr)
  {
    let count = 0;
    for (let i = 0; i < arr.length; ++i)
    {
      if (!arr[i])
      {
        ++count;
      }
    }
    return count;
  }
  
  //Call on a square after it is changed
  //Updates which squares have duplicate values
  //It is sufficient to check the row, column, and box of only the changed square
  updateDuplicates(x, y)
  {
    let myNumber = this.state.board[y][x];

    let duplicatesCopy = this.state.duplicates.slice();

  }

  render()
  {
    let rowStatuses = this.calculateRowStatuses();
    let columnStatuses = this.calculateColumnStatuses();
    let boxStatuses = this.calculateBoxStatuses();    

    let rowsLeft = this.countRemaining(rowStatuses);
    let columnsLeft = this.countRemaining(columnStatuses);
    let boxesLeft = this.countRemaining(boxStatuses);

    return(
      <div onKeyDown={(event) => this.handleKeyDown(event)}>
        <div className="board-row">
          {this.renderSquare(0, 0, NONE)}
          {this.renderSquare(0, 1, NONE)}
          {this.renderSquare(0, 2, RIGHT)}
          {this.renderSquare(0, 3, NONE)}
          {this.renderSquare(0, 4, NONE)}
          {this.renderSquare(0, 5, RIGHT)}
          {this.renderSquare(0, 6, NONE)}
          {this.renderSquare(0, 7, NONE)}
          {this.renderSquare(0, 8, NONE)}
          {this.renderRowStatus(rowStatuses[0])}
        </div>
        <div className="board-row">
          {this.renderSquare(1, 0, NONE)}
          {this.renderSquare(1, 1, NONE)}
          {this.renderSquare(1, 2, RIGHT)}
          {this.renderSquare(1, 3, NONE)}
          {this.renderSquare(1, 4, NONE)}
          {this.renderSquare(1, 5, RIGHT)}
          {this.renderSquare(1, 6, NONE)}
          {this.renderSquare(1, 7, NONE)}
          {this.renderSquare(1, 8, NONE)}
          {this.renderRowStatus(rowStatuses[1])}
        </div>
        <div className="board-row">
          {this.renderSquare(2, 0, BOTTOM)}
          {this.renderSquare(2, 1, BOTTOM)}
          {this.renderSquare(2, 2, BOTTOM_RIGHT)}
          {this.renderSquare(2, 3, BOTTOM)}
          {this.renderSquare(2, 4, BOTTOM)}
          {this.renderSquare(2, 5, BOTTOM_RIGHT)}
          {this.renderSquare(2, 6, BOTTOM)}
          {this.renderSquare(2, 7, BOTTOM)}
          {this.renderSquare(2, 8, BOTTOM)}
          {this.renderRowStatus(rowStatuses[2])}
        </div>
        <div className="board-row">
          {this.renderSquare(3, 0, NONE)}
          {this.renderSquare(3, 1, NONE)}
          {this.renderSquare(3, 2, RIGHT)}
          {this.renderSquare(3, 3, NONE)}
          {this.renderSquare(3, 4, NONE)}
          {this.renderSquare(3, 5, RIGHT)}
          {this.renderSquare(3, 6, NONE)}
          {this.renderSquare(3, 7, NONE)}
          {this.renderSquare(3, 8, NONE)}
          {this.renderRowStatus(rowStatuses[3])}
        </div>
        <div className="board-row">
          {this.renderSquare(4, 0, NONE)}
          {this.renderSquare(4, 1, NONE)}
          {this.renderSquare(4, 2, RIGHT)}
          {this.renderSquare(4, 3, NONE)}
          {this.renderSquare(4, 4, NONE)}
          {this.renderSquare(4, 5, RIGHT)}
          {this.renderSquare(4, 6, NONE)}
          {this.renderSquare(4, 7, NONE)}
          {this.renderSquare(4, 8, NONE)}
          {this.renderRowStatus(rowStatuses[4])}
        </div>
        <div className="board-row">
          {this.renderSquare(5, 0, BOTTOM)}
          {this.renderSquare(5, 1, BOTTOM)}
          {this.renderSquare(5, 2, BOTTOM_RIGHT)}
          {this.renderSquare(5, 3, BOTTOM)}
          {this.renderSquare(5, 4, BOTTOM)}
          {this.renderSquare(5, 5, BOTTOM_RIGHT)}
          {this.renderSquare(5, 6, BOTTOM)}
          {this.renderSquare(5, 7, BOTTOM)}
          {this.renderSquare(5, 8, BOTTOM)}
          {this.renderRowStatus(rowStatuses[5])}
        </div>
        <div className="board-row">
          {this.renderSquare(6, 0, NONE)}
          {this.renderSquare(6, 1, NONE)}
          {this.renderSquare(6, 2, RIGHT)}
          {this.renderSquare(6, 3, NONE)}
          {this.renderSquare(6, 4, NONE)}
          {this.renderSquare(6, 5, RIGHT)}
          {this.renderSquare(6, 6, NONE)}
          {this.renderSquare(6, 7, NONE)}
          {this.renderSquare(6, 8, NONE)}
          {this.renderRowStatus(rowStatuses[6])}
        </div>
        <div className="board-row">
          {this.renderSquare(7, 0, NONE)}
          {this.renderSquare(7, 1, NONE)}
          {this.renderSquare(7, 2, RIGHT)}
          {this.renderSquare(7, 3, NONE)}
          {this.renderSquare(7, 4, NONE)}
          {this.renderSquare(7, 5, RIGHT)}
          {this.renderSquare(7, 6, NONE)}
          {this.renderSquare(7, 7, NONE)}
          {this.renderSquare(7, 8, NONE)}
          {this.renderRowStatus(rowStatuses[7])}
        </div>
        <div className="board-row">
          {this.renderSquare(8, 0, NONE)}
          {this.renderSquare(8, 1, NONE)}
          {this.renderSquare(8, 2, RIGHT)}
          {this.renderSquare(8, 3, NONE)}
          {this.renderSquare(8, 4, NONE)}
          {this.renderSquare(8, 5, RIGHT)}
          {this.renderSquare(8, 6, NONE)}
          {this.renderSquare(8, 7, NONE)}
          {this.renderSquare(8, 8, NONE)}
          {this.renderRowStatus(rowStatuses[8])}
        </div>
        <div className="board-row">
          {this.renderColumnStatus(columnStatuses[0])}
          {this.renderColumnStatus(columnStatuses[1])}
          {this.renderColumnStatus(columnStatuses[2])}
          {this.renderColumnStatus(columnStatuses[3])}
          {this.renderColumnStatus(columnStatuses[4])}
          {this.renderColumnStatus(columnStatuses[5])}
          {this.renderColumnStatus(columnStatuses[6])}
          {this.renderColumnStatus(columnStatuses[7])}
          {this.renderColumnStatus(columnStatuses[8])}
        </div>
        <div className="board-row gap">
          {this.renderBoxStatus(boxStatuses[0])}
          {this.renderBoxStatus(boxStatuses[1])}
          {this.renderBoxStatus(boxStatuses[2])}
        </div>
        <div className="board-row">
          {this.renderBoxStatus(boxStatuses[3])}
          {this.renderBoxStatus(boxStatuses[4])}
          {this.renderBoxStatus(boxStatuses[5])}
        </div>
        <div className="board-row">
          {this.renderBoxStatus(boxStatuses[6])}
          {this.renderBoxStatus(boxStatuses[7])}
          {this.renderBoxStatus(boxStatuses[8])}
        </div>
        <div className="gap"></div>
        <GameStatus rowsLeft={rowsLeft} columnsLeft={columnsLeft} boxesLeft={boxesLeft}></GameStatus>
      </div>
    );
  }
  
}


ReactDOM.render(
  <React.StrictMode>
    <Game />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
