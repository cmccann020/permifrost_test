import SSF from 'ssf';
import Vue from 'vue';
import sqlFormatter from 'sql-formatter';
import designApi from '../../api/design';
import utils from '../../api/utils';

const state = {
  design: {
    related_table: {},
  },
  hasSQLError: false,
  sqlErrorMessage: [],
  currentModel: '',
  currentDesign: '',
  results: [],
  keys: [],
  columnHeaders: [],
  names: [],
  resultAggregates: {},
  loadingQuery: false,
  currentDataTab: 'sql',
  selectedColumns: {},
  currentSQL: '',
  filtersOpen: false,
  dataOpen: true,
  chartsOpen: false,
  chartType: 'BarChart',
  limit: 3,
  distincts: {},
  sortColumn: null,
  sortDesc: false,
};

const getters = {
  hasResults() {
    if (!state.results) return false;
    return !!state.results.length;
  },

  numResults() {
    if (!state.results) return 0;
    return state.results.length;
  },

  getDistinctsForField: () => field => state.distincts[field],

  getResultsFromDistinct: () => (field) => {
    const thisDistinct = state.distincts[field];
    if (!thisDistinct) {
      return null;
    }
    return thisDistinct.results;
  },

  hasJoins() {
    return !!(state.design.joins && state.design.joins.length);
  },

  isColumnSorted: () => key => state.sortColumn === key,

  showJoinColumnAggregateHeader: () => obj => !!obj,

  joinIsExpanded: () => join => join.expanded,
  getKeyFromDistinct: () => (field) => {
    const thisDistinct = state.distincts[field];
    if (!thisDistinct) {
      return null;
    }
    return thisDistinct.keys[0];
  },
  getSelectionsFromDistinct: () => (field) => {
    const thisDistinct = state.distincts[field];
    if (!thisDistinct) {
      return [];
    }
    const thisDistinctSelections = thisDistinct.selections;
    if (!thisDistinctSelections) {
      return [];
    }
    return thisDistinctSelections;
  },

  getChartYAxis() {
    if (!state.resultAggregates) return [];
    const aggregates = Object.keys(state.resultAggregates);
    return aggregates;
  },

  isColumnSelectedAggregate: () => columnName => columnName in state.resultAggregates,

  getFormattedValue: () => (fmt, value) => SSF.format(fmt, Number(value)),

  currentModelLabel() {
    return utils.titleCase(state.currentModel);
  },
  currentDesignLabel() {
    return utils.titleCase(state.currentModel);
  },

  isDataTab() {
    return state.currentDataTab === 'data';
  },

  isResultsTab() {
    return state.currentDataTab === 'results';
  },

  isSQLTab() {
    return state.currentDataTab === 'sql';
  },

  currentLimit() {
    return state.limit;
  },

  formattedSql() {
    return sqlFormatter.format(state.currentSQL);
  },
};

const actions = {
  getDesign({ commit }, { model, design }) {
    state.currentModel = model;
    state.currentDesign = design;
    designApi.index(model, design)
      .then((data) => {
        commit('setDesign', data.data);
        commit('selectedColumns', data.data.related_table.columns);
      });
  },

  expandRow({ commit }) {
    commit('toggleCollapsed');
  },

  expandJoinRow({ commit }, join) {
    // already fetched columns
    commit('toggleJoinOpen', join);
    if (join.related_table.columns.length) return;
    designApi.getTable(join.related_table.name)
      .then((data) => {
        commit('setJoinColumns', {
          columns: data.data.columns,
          join,
        });
        commit('setJoinColumnGroups', {
          columnGroups: data.data.column_groups,
          join,
        });
        commit('setJoinAggregates', {
          aggregates: data.data.aggregates,
          join,
        });
      });
  },

  removeSort({ commit }, column) {
    if (!state.sortColumn || state.sortColumn !== column.name) return;
    commit('setRemoveSort', column);
  },

  toggleColumn({ commit }, column) {
    commit('toggleColumnSelected', column);
  },

  toggleColumnGroup({ commit }, columnGroup) {
    commit('toggleColumnGroupSelected', columnGroup);
  },

  toggleColumnGroupTimeframe({ commit }, columnGroupObj) {
    commit('toggleColumnGroupTimeframeSelected', columnGroupObj);
  },

  toggleAggregate({ commit }, aggregate) {
    commit('toggleAggregateSelected', aggregate);
  },

  limitSet({ commit }, limit) {
    commit('setLimit', limit);
  },

  setChartType({ commit }, chartType) {
    commit('setChartType', chartType);
  },

  getSQL({ commit }, { run }) {
    this.dispatch('designs/resetErrorMessage');
    const baseTable = state.design.related_table;
    const columns = baseTable
      .columns
      .filter(d => d.selected)
      .map(d => d.name);
    let sortColumn = baseTable
      .columns
      .find(d => d.name === state.sortColumn);
    if (!sortColumn) {
      sortColumn = baseTable
        .aggregates
        .find(d => d.name === state.sortColumn);
    }
    const aggregates = baseTable
      .aggregates
      .filter(m => m.selected)
      .map(m => m.name);

    const filters = JSON.parse(JSON.stringify(state.distincts));
    const filtersKeys = Object.keys(filters);
    filtersKeys.forEach((prop) => {
      delete filters[prop].results;
      delete filters[prop].sql;
    });

    const joins = state.design
      .joins
      .map((j) => {
        const newJoin = {};
        newJoin.name = j.name;
        if (j.columns) {
          newJoin.columns = j.columns
            .filter(d => d.selected)
            .map(d => d.name);
          if (!newJoin.columns.length) delete newJoin.columns;
        }
        if (j.aggregates) {
          newJoin.aggregates = j.aggregates
            .filter(m => m.selected)
            .map(m => m.name);
          if (!newJoin.aggregates.length) delete newJoin.aggregates;
        }
        return newJoin;
      })
      .filter(j => !!(j.columns || j.aggregates));

    let order = null;
    const columnGroups = baseTable
      .column_groups || [] // TODO update default empty array likely in the m5o_file_parser to set proper defaults if user's exclude certain properties in their models
      .map(dg => ({
        name: dg.name,
        timeframes: dg.timeframes
          .filter(tf => tf.selected)
          .map(tf => tf.name),
      }))
      .filter(dg => dg.timeframes.length);

    if (sortColumn) {
      order = {
        column: sortColumn.name,
        direction: state.sortDesc ? 'desc' : 'asc',
      };
    }

    const postData = {
      table: baseTable.name,
      columns,
      column_groups: columnGroups,
      aggregates,
      joins,
      order,
      limit: state.limit,
      filters,
      run,
    };
    if (run) state.loadingQuery = true;
    designApi.getSql(state.currentModel, state.currentDesign, postData)
      .then((data) => {
        if (run) {
          commit('setQueryResults', data.data);
          commit('setSQLResults', data.data);
          state.loadingQuery = false;
        } else {
          commit('setSQLResults', data.data);
        }
      })
      .catch((e) => {
        commit('setSqlErrorMessage', e);
        state.loadingQuery = false;
      });
  },

  resetErrorMessage({ commit }) {
    commit('setErrorState');
  },

  getDistinct({ commit }, field) {
    designApi.getDistinct(state.currentModel, state.currentDesign, field)
      .then((data) => {
        commit('setDistincts', {
          data: data.data,
          field,
        });
      });
  },

  addDistinctSelection({ commit }, data) {
    commit('setSelectedDistincts', data);
  },

  addDistinctModifier({ commit }, data) {
    commit('setModifierDistincts', data);
  },

  switchCurrentTab({ commit }, tab) {
    commit('setCurrentTab', tab);
  },

  toggleFilterOpen({ commit }) {
    commit('setFilterToggle');
  },

  toggleDataOpen({ commit }) {
    commit('setDataToggle');
  },

  toggleChartsOpen({ commit }) {
    commit('setChartToggle');
  },

  sortBy({ commit }, name) {
    commit('setSortColumn', name);
    this.dispatch('designs/getSQL', {
      run: true,
    });
  },
};

const mutations = {

  setRemoveSort() {
    state.sortColumn = null;
  },

  setChartType(context, chartType) {
    state.chartType = chartType;
  },

  setSortColumn(context, name) {
    if (state.sortColumn === name) {
      state.sortDesc = !state.sortDesc;
    }
    state.sortColumn = name;
  },

  setDistincts(_, { data, field }) {
    Vue.set(state.distincts, field, data);
  },

  setJoinColumns(_, { columns, join }) {
    join.columns = columns;
  },

  setJoinColumnGroups(_, { columnGroups, join }) {
    join.column_groups = columnGroups;
  },

  setJoinAggregates(_, { aggregates, join }) {
    join.aggregates = aggregates;
  },

  toggleJoinOpen(_, join) {
    const thisJoin = join;
    thisJoin.collapsed = !thisJoin.collapsed;
  },

  setSelectedDistincts(_, { item, field }) {
    if (!state.distincts[field].selections) {
      Vue.set(state.distincts[field], 'selections', []);
    }
    if (state.distincts[field].selections.indexOf(item) === -1) {
      state.distincts[field].selections.push(item);
    }
  },

  setModifierDistincts(_, { item, field }) {
    Vue.set(state.distincts[field], 'modifier', item);
  },

  setFilterToggle() {
    state.filtersOpen = !state.filtersOpen;
  },

  setDataToggle() {
    state.dataOpen = !state.dataOpen;
  },

  setChartToggle() {
    state.chartsOpen = !state.chartsOpen;
  },

  setSQLResults(_, results) {
    state.currentSQL = results.sql;
  },

  setQueryResults(_, results) {
    state.results = results.results;
    state.keys = results.keys;
    state.columnHeaders = results.column_headers;
    state.names = results.names;
    state.resultAggregates = results.aggregates;
  },

  setSqlErrorMessage(_, e) {
    state.hasSQLError = true;
    if (!e.response) {
      state.sqlErrorMessage = ['Something went wrong on our end. We\'ll check our error logs and get back to you.'];
      return;
    }
    const error = e.response.data;
    state.sqlErrorMessage = [error.code, error.orig, error.statement];
  },

  setErrorState() {
    state.hasSQLError = false;
    state.sqlErrorMessage = [];
  },

  toggleColumnSelected(_, column) {
    const selectedColumn = column;
    selectedColumn.selected = !column.selected;
  },

  toggleColumnGroupSelected(_, columnGroup) {
    const selectedColumnGroup = columnGroup;
    selectedColumnGroup.selected = !selectedColumnGroup.selected;
  },

  toggleColumnGroupTimeframeSelected(_, { timeframe }) {
    const selectedTimeframe = timeframe;
    selectedTimeframe.selected = !selectedTimeframe.selected;
  },

  toggleAggregateSelected(_, aggregate) {
    const selectedAggregate = aggregate;
    selectedAggregate.selected = !aggregate.selected;
  },

  selectedColumns(_, columns) {
    Object.keys(columns).forEach(column => {
      state.selectedColumns[column.unique_name] = false;
    });
  },

  setDesign(_, designData) {
    state.design = designData;
  },

  toggleCollapsed() {
    state.design.related_table.collapsed = !state.design.related_table.collapsed;
  },

  setCurrentTab(_, tab) {
    state.currentDataTab = tab;
  },

  setLimit(_, limit) {
    state.limit = limit;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};