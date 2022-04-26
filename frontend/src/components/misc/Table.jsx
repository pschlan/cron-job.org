import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Table as MaterialTable, TableHead, TableRow, TableCell, TableBody, LinearProgress, TableFooter, makeStyles, TablePagination, Checkbox, Box } from '@material-ui/core';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import DragHandleIcon from '@material-ui/icons/DragHandle';
import ActionMenu from './ActionMenu';
import ActionsIcon from '@material-ui/icons/MoreVert';
import ExpandIcon from '@material-ui/icons/ExpandMore';

const useStyles = makeStyles(theme => ({
  table: {
    '& th': {
      fontWeight: 'bold'
    },
    '& tr': {
      backgroundColor: '#fff'
    }
  }
}));

function DroppableComponent({ onDragEnd, onBeforeDragStart, ...props }) {
  return <DragDropContext onDragEnd={onDragEnd} onBeforeDragStart={onBeforeDragStart}>
    <Droppable droppableId={'1'} direction='vertical'>
      {provided => <TableBody ref={provided.innerRef} {...props.droppableProps} {...props}>
          {props.children}
          {provided.placeholder}
        </TableBody>}
    </Droppable>
  </DragDropContext>;
}

function DraggableTableCell({ isDragging, ...props }) {
  const ref = useRef();

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    if (isDragging) {
      const { width, height } = ref.current.getBoundingClientRect();
      if (ref.current.style.width !== width) {
        ref.current.style.width = `${width}px`;
        ref.current.style.height = `${height}px`;
      }
    } else {
      ref.current.style.removeProperty('width');
      ref.current.style.removeProperty('height');
    }
  }, [isDragging]);

  return <TableCell ref={ref} {...props}>{props.children}</TableCell>;
}

function DraggableComponent({ id, index, isDragging, ...props }) {
  return <Draggable draggableId={'draggable'+id} index={index}>
    {provided => <TableRow
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...props}>
          <DraggableTableCell isDragging={isDragging} {...provided.dragHandleProps}>
            <DragHandleIcon />
          </DraggableTableCell>
          {props.children}
      </TableRow>}
  </Draggable>;
}

export default function Table({ size, columns, items, empty, footer, loading=false, className, noHeader=false, rowIdentifier=null, perPage=null, reorderable=false, multiSelect=false, multiActions=null, onReorder=()=>null, onBeforeDragStart=()=>null, rowsPerPageOptions=null }) {
  const classes = useStyles();
  const { t } = useTranslation();

  const [ page, setPage ] = useState(0);
  const [ rowsPerPage, setRowsPerPage ] = useState(perPage);
  const [ data, setData ] = useState([]);
  const [ dragging, setDragging ] = useState(false);
  const [ selectedRows, setSelectedRows ] = useState([]);

  function onMultiActionClick(item) {
    if (item.onExecute) {
      item.onExecute([...selectedRows]);
    }
  }

  function onRowSelectChanged(rowId, {target}) {
    const checked = target.checked;

    setSelectedRows(rows => {
      if (checked && !rows.includes(rowId)) {
        return [...rows, rowId];
      } else if (!checked && rows.includes(rowId)) {
        return rows.filter(x => x !== rowId);
      }
      return [...rows];
    });
  }

  const onDragEnd = useCallback(event => {
    setDragging(false);

    if (!event.destination || event.source.index === event.destination.ondex) {
      return;
    }

    const reorderedData = [...data];
    const [removed] = reorderedData.splice(event.source.index, 1);
    reorderedData.splice(event.destination.index, 0, removed);
    onReorder(reorderedData);

    setData(reorderedData);
  }, [onReorder, data]);

  const onBeforeDragStartHook = useCallback(event => {
    setDragging(true);
    onBeforeDragStart(event);
  }, [onBeforeDragStart]);

  const droppableProps = reorderable ? {
    onDragEnd: onDragEnd,
    onBeforeDragStart: onBeforeDragStartHook
  } : {};

  const draggableProps = reorderable ? {
    isDragging: dragging
  } : {};

  useEffect(() => {
    if (page * rowsPerPage >= items.length) {
      setPage(Math.max(1, Math.floor(items.length / rowsPerPage)) - 1);
    }
  }, [items, page, rowsPerPage]);

  useEffect(() => {
    if (rowsPerPage !== null) {
      setData(items.slice(page * rowsPerPage, (page + 1) * rowsPerPage));
    } else {
      setData(items);
    }
  }, [items, page, rowsPerPage]);

  useEffect(() => {
    const validRowIds = items.map((item, itemNo) => rowIdentifier ? item[rowIdentifier] : itemNo);
    const filteredRows = selectedRows.filter(rowId => validRowIds.includes(rowId));
    if (filteredRows.length < selectedRows.length) {
      setSelectedRows(filteredRows);
    }
  }, [items, selectedRows, rowIdentifier]);

  return <MaterialTable size={size} className={clsx(className, classes.table)}>
    {!noHeader && <TableHead>
      <TableRow>
        {reorderable && <TableCell />}
        {multiSelect && <TableCell />}
        {columns.map((column, columnNo) =>
          <TableCell key={columnNo}>{column.head}</TableCell>)}
      </TableRow>
    </TableHead>}
    <TableBody {...droppableProps} component={reorderable ? DroppableComponent : undefined}>
      {loading ?
      <TableRow>
        <TableCell colSpan={columns.length}>
          <LinearProgress />
        </TableCell>
      </TableRow> :
      <>
        {data.map((item, itemNo) =>
          <TableRow {...draggableProps} key={rowIdentifier ? item[rowIdentifier] : itemNo} id={rowIdentifier ? item[rowIdentifier] : itemNo} index={itemNo} component={reorderable ? DraggableComponent : undefined}>
            {multiSelect && <DraggableTableCell {...draggableProps}><Checkbox onChange={event => onRowSelectChanged(rowIdentifier ? item[rowIdentifier] : itemNo, event)} /></DraggableTableCell>}
            {columns.map((column, columnNo) =>
              <DraggableTableCell {...draggableProps} key={columnNo}>{column.cell(item, itemNo, columnNo)}</DraggableTableCell>)}
          </TableRow>)}
        {!data.length && <TableRow>
          <TableCell colSpan={columns.length}>
            {empty}
          </TableCell>
        </TableRow>}
      </>}
    </TableBody>
    {(footer || rowsPerPage || (multiSelect && selectedRows.length > 0)) && <TableFooter>
        {multiSelect && selectedRows.length > 0 && <TableRow>
          <TableCell colSpan={columns.length}>
            <Box display='flex' alignItems='center'>
              <Box>
                {t('common.selectedItems', { count: selectedRows.length })}
              </Box>
              {multiActions && <Box pl={2}>
                <ActionMenu
                  variant='text'
                  size='small'
                  startIcon={<ActionsIcon />}
                  endIcon={<ExpandIcon />}
                  text={t('common.actions')}
                  items={multiActions}
                  onClickItem={item => onMultiActionClick(item)}
                  />
              </Box>}
            </Box>
          </TableCell>
        </TableRow>}
        {footer && <TableRow>
          <TableCell colSpan={columns.length}>
            {footer}
          </TableCell>
        </TableRow>}
        {rowsPerPage && <TableRow>
            <TablePagination
              rowsPerPageOptions={rowsPerPageOptions || [5, 10, 25, 50]}
              colSpan={columns.length}
              count={items.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onChangePage={(event, newPage) => setPage(newPage)}
              onChangeRowsPerPage={event => setRowsPerPage(event.target.value)}
              labelRowsPerPage={t('common.rowsPerPage')}
              nextIconButtonText={t('common.nextPage')}
              backIconButtonText={t('common.previousPage')}
              labelDisplayedRows={({from, to, count}) => t(
                  'common.rowsFromTo',
                  {
                    from,
                    to,
                    total: count !== -1 ? count : t('common.moreThan', { to })
                  }
                )}
              />
          </TableRow>}
      </TableFooter>}
  </MaterialTable>;
}
