require('module-alias/register');
const BOBasePage = require('@pages/BO/BObasePage');

module.exports = class Stocks extends BOBasePage {
  constructor(page) {
    super(page);

    this.pageTitle = 'Stock •';
    this.successfulUpdateMessage = 'Stock successfully updated';

    // Selectors
    this.movementsNavItemLink = '#head_tabs li:nth-child(2) > a';
    this.searchForm = 'form.search-form';
    this.searchInput = `${this.searchForm} input.input`;
    this.searchButton = `${this.searchForm} button.search-button`;
    // tags
    this.searchTagsList = 'form.search-form div.tags-wrapper span.tag';
    this.searchTagsListCloseSpan = `${this.searchTagsList} i`;

    // Bulk actions
    this.selectAllCheckbox = '#bulk-action + i';
    this.bulkEditQuantityInput = 'div.bulk-qty input';
    this.applyNewQuantityButton = 'button.update-qty';

    this.productList = 'table.table';
    this.productRows = `${this.productList} tbody tr`;
    this.productRow = `${this.productRows}:nth-child(%ROW)`;
    this.productRowNameColumn = `${this.productRow} td:nth-child(1) div.media-body p`;
    this.productRowReferenceColumn = `${this.productRow} td:nth-child(2)`;
    this.productRowSupplierColumn = `${this.productRow} td:nth-child(3)`;
    this.productRowPhysicalColumn = `${this.productRow} td:nth-child(5)`;
    this.productRowReservedColumn = `${this.productRow} td:nth-child(6)`;
    this.productRowAvailableColumn = `${this.productRow} td:nth-child(7)`;
    // Quantity column
    this.productRowQuantityColumn = `${this.productRow} td.qty-spinner`;
    this.productRowQuantityColumnInput = `${this.productRowQuantityColumn} div.edit-qty input`;
    this.productRowQuantityUpdateButton = `${this.productRowQuantityColumn} button.check-button`;

    // loader
    this.productListLoading = `${this.productRow.replace('%ROW', 1)} td:nth-child(1) div.ps-loader`;

    // Filters containers
    this.filtersContainerDiv = '#filters-container';
    this.advancedFiltersButton = `${this.filtersContainerDiv} button[data-target='#filters']`;
    this.filterStatusEnabledLabel = '#enable + label';
    this.filterStatusDisabledLabel = '#disable + label';
    this.filterStatusAllLabel = '#all + label';
    // Filter category
    this.filterCategoryDiv = `${this.filtersContainerDiv} div.filter-categories`;
    this.filterCategoryExpandButton = `${this.filterCategoryDiv} button:nth-child(1)`;
    this.filterCategoryCollapseButton = `${this.filterCategoryDiv} button:nth-child(2)`;
    this.filterCategoryTreeItems = `${this.filterCategoryDiv} div.ps-tree-items[label='%CATEGORY']`;
    this.filterCategoryCheckBoxDiv = `${this.filterCategoryTreeItems} .md-checkbox`;
  }

  /*
  Methods
   */

  /**
   * Change Tab to Movements in Stock Page
   * @return {Promise<void>}
   */
  async goToSubTabMovements() {
    await this.page.click(this.movementsNavItemLink);
    await this.waitForVisibleSelector(`${this.movementsNavItemLink}.active`);
  }

  /**
   * Get the number of lines in the main table
   * @returns {Promise<*>}
   */
  async getNumberOfProductsFromList() {
    await this.page.waitForSelector(this.productListLoading, {hidden: true});
    return (await this.page.$$(this.productRows)).length;
  }

  /**
   * Remove all filter tags in the basic search input
   * @returns {Promise<void>}
   */
  async resetFilter() {
    const closeButtons = await this.page.$$(this.searchTagsListCloseSpan);
    /* eslint-disable no-restricted-syntax */
    for (const closeButton of closeButtons) {
      await closeButton.click();
    }
    /* eslint-enable no-restricted-syntax */
    return this.getNumberOfProductsFromList();
  }

  /**
   * Filter by a word
   * @param value
   * @returns {Promise<void>}
   */
  async simpleFilter(value) {
    await this.page.type(this.searchInput, value);
    await Promise.all([
      this.page.click(this.searchButton),
      this.waitForVisibleSelector(this.productListLoading),
    ]);
    await this.page.waitForSelector(this.productListLoading, {hidden: true});
  }

  /**
   * get text from column in table
   * @param row
   * @param column, only 3 column are implemented : name, reference, supplier
   * @return {Promise<integer|textContent>}
   */
  async getTextColumnFromTableStocks(row, column) {
    switch (column) {
      case 'name':
        return this.getTextContent(this.productRowNameColumn.replace('%ROW', row));
      case 'reference':
        return this.getTextContent(this.productRowReferenceColumn.replace('%ROW', row));
      case 'supplier':
        return this.getTextContent(this.productRowSupplierColumn.replace('%ROW', row));
      case 'physical':
        return this.getNumberFromText(this.productRowPhysicalColumn.replace('%ROW', row));
      case 'reserved':
        return this.getNumberFromText(this.productRowReservedColumn.replace('%ROW', row));
      case 'available':
        return this.getNumberFromText(this.productRowAvailableColumn.replace('%ROW', row));
      default:
        throw new Error(`${column} was not find as column in this table`);
    }
  }


  /**
   * Get all products names from table
   * @return {Promise<[]>}
   */
  async getAllProductsName() {
    const productsNames = [];
    const numberOfProductsInlist = await this.getNumberOfProductsFromList();
    for (let row = 1; row <= numberOfProductsInlist; row++) {
      await productsNames.push(await this.getTextColumnFromTableStocks(row, 'name'));
    }
    return productsNames;
  }

  /**
   * Get
   * @param row, row in table
   * @return {Promise<{reserved: (integer), available: (integer), physical: (integer)}>}
   */
  async getStockQuantityForProduct(row) {
    return {
      physical: await (this.getTextColumnFromTableStocks(row, 'physical')),
      reserved: await (this.getTextColumnFromTableStocks(row, 'reserved')),
      available: await (this.getTextColumnFromTableStocks(row, 'available')),
    };
  }

  /**
   * Update Stock value by setting input value
   * @param row, row in table
   * @param value, value to add/subtract from quantity
   * @return {Promise<textContent>}
   */
  async updateRowQuantityWithInput(row, value) {
    await this.setValue(this.productRowQuantityColumnInput.replace('%ROW', row), value.toString());
    // Wait for check button before click
    await this.waitForSelectorAndClick(this.productRowQuantityUpdateButton.replace('%ROW', row));
    // Wait for alert-Box after update quantity and close alert-Box
    await this.waitForVisibleSelector(this.alertBoxTextSpan);
    const textContent = await this.getTextContent(this.alertBoxTextSpan);
    await this.page.click(this.alertBoxButtonClose);
    return textContent;
  }

  /**
   * Bulk Edit quantity by setting input value
   * @param value
   * @return {Promise<textContent>}
   */
  async bulkEditQuantityWithInput(value) {
    // Select All products
    await this.page.click(this.selectAllCheckbox);
    // Set value in input
    await this.setValue(this.bulkEditQuantityInput, value.toString());
    // Wait for check button before click
    await this.page.click(this.applyNewQuantityButton);
    // Wait for alert-Box after update quantity and close alert-Box
    await this.waitForVisibleSelector(this.alertBoxTextSpan);
    const textContent = await this.getTextContent(this.alertBoxTextSpan);
    await this.page.click(this.alertBoxButtonClose);
    return textContent;
  }

  /**
   * Filter stocks by product's status
   * @param status
   * @return {Promise<void>}
   */
  async filterByStatus(status) {
    await this.openCloseAdvancedFilter();
    switch (status) {
      case 'enabled':
        await this.page.click(this.filterStatusEnabledLabel);
        break;
      case 'disabled':
        await this.page.click(this.filterStatusDisabledLabel);
        break;
      case 'all':
        await this.page.click(this.filterStatusAllLabel);
        break;
      default:
        throw Error(`${status} was not found as an option`);
    }
  }

  /**
   * Filter stocks by product's category
   * @param category
   * @return {Promise<void>}
   */
  async filterByCategory(category) {
    await this.openCloseAdvancedFilter();
    await this.page.click(this.filterCategoryExpandButton);
    await Promise.all([
      this.waitForVisibleSelector(this.productListLoading),
      this.page.click(this.filterCategoryCheckBoxDiv.replace('%CATEGORY', category)),
    ]);
    await this.page.waitForSelector(this.productListLoading, {hidden: true});
    await this.page.click(this.filterCategoryCollapseButton);
    await this.openCloseAdvancedFilter(false);
  }

  /**
   * Open / close advanced filter
   * @param toOpen
   * @return {Promise<void>}
   */
  async openCloseAdvancedFilter(toOpen = true) {
    await Promise.all([
      this.page.click(this.advancedFiltersButton),
      this.waitForVisibleSelector(`${this.advancedFiltersButton}[aria-expanded='${toOpen.toString()}']`),
    ]);
  }

  /**
   * Reset and get number of products in list
   * @return {Promise<int>}
   */
  async resetAndGetNumberOfProductsFromList() {
    await this.reloadPage();
    return this.getNumberOfProductsFromList();
  }
};
